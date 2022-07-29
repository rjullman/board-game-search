"""
Download and process board game data from BoardGameGeek (BGG).
"""

import itertools
import json
import os
import sys
import threading
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from io import BytesIO
from typing import (
    Any,
    Dict,
    Iterable,
    Iterator,
    List,
    Literal,
    NamedTuple,
    Optional,
    Tuple,
    TypeVar,
)

import click
import elasticsearch.helpers
import requests
from elasticsearch import Elasticsearch
from lxml import etree
from lxml.etree import _Element as XMLElement

T = TypeVar("T")

CONNECTION_ENV_VAR = "ELASTICSEARCH_ENDPOINT"

BGG_TOP_RANKED_GAMES_URL = "https://boardgamegeek.com/browse/boardgame/page/{page}"
BGG_THING_API_URL = "https://boardgamegeek.com/xmlapi2/thing?stats=1&id={ids}"

API_BATCH_SIZE = 1000

ES_GAME_INDEX_NAME = "boardgames"
ES_TAG_INDEX_NAME = "tags"

ES_MAX_SEARCH_WINDOW = 10000


class GameBasicMetadata(NamedTuple):
    """
    Basic metadata for a BGG board game.

    This metadata is scraped during game discovery before populating other metdata.
    """

    id: int  # BGG board game id.
    slug: str  # BGG board game slug.
    brief_description: Optional[str]


class EntityLink(NamedTuple):
    """
    Link to a BGG entity (category, mechanic, family, expansion, etc.).
    """

    id: int
    name: str


class Game(NamedTuple):
    """
    Metadata for a BGG board game.
    """

    id: int
    slug: str
    name: str
    thumbnail: Optional[str]
    description: Optional[str]
    brief_description: Optional[str]
    expected_playtime: int
    min_players: int
    max_players: int
    min_playtime: int
    max_playtime: int
    min_age: int
    rank: int
    rating: float
    num_ratings: int
    weight: Optional[float]
    year_published: int
    categories: List[EntityLink]
    mechanics: List[EntityLink]
    families: List[EntityLink]
    expansions: List[EntityLink]


TagType = Literal["mechanic", "category"]


class Tag(NamedTuple):
    """
    A board game tag (e.g. game mechanics and themes).

    These are indexed separately so you can easily list them all for further filtering.
    """

    id: int
    name: str
    type: TagType


GameOrTagType = TypeVar("GameOrTagType", Game, Tag)


def die(msg: str) -> None:
    """
    Die with an stderr error message.
    """
    print(msg, file=sys.stderr)
    sys.exit(1)


def chunked(iterable: Iterable[T], n: int) -> Iterable[List[T]]:
    """
    Split an iterable into n-element lists. The final chunk may have fewer than
    n elements if the length of the input iterable is not an even multiple of n.

    This function reads from the input iterable one chunk at a time, and yields
    each chunk as it goes, so it's safe to use even on very large generators.
    Memory usage is proportional to the chunk size (n) and independent of the
    number of elements in the iterable.
    """
    iterator = iter(iterable)
    while True:
        chunk = list(itertools.islice(iterator, n))
        if chunk:
            yield chunk
        else:
            break


def xml_get_opt(
    item: XMLElement,
    path: Optional[str] = None,
    attr: Optional[str] = None,
    *,
    xpath: bool = False,
) -> Optional[str]:
    """
    Helper for LXML to get an attribute at a path from an XML element.

    Returns None if the path or attribute do not exist.
    """
    if path:
        if xpath:
            elems = item.xpath(path)
            assert isinstance(elems, list)
            elem = elems[0] if elems else None
            assert elem is None or isinstance(elem, XMLElement)
        else:
            elem = item.find(path)
    else:
        elem = item

    if elem is None:
        return None
    ret = elem.get(attr) if attr else elem.text
    if ret is None:
        return None
    if isinstance(ret, bytes):
        raise ValueError("Expected result to be a str not bytes.")
    return ret


def xml_get(
    item: XMLElement,
    path: Optional[str] = None,
    attr: Optional[str] = None,
    *,
    xpath: bool = False,
) -> str:
    """
    Helper for LXML to get an attribute at a path from an XML element.

    Raises a ValueError if the path or attribute do not exist.
    """
    ret = xml_get_opt(item, path, attr, xpath=xpath)
    if ret is None:
        if path and item.find(path) is None:
            raise ValueError(f"Could not find XML path '{path}'.")
        raise ValueError(f"Could not find XML attr '{attr}' at path '{path}'.")
    return ret


class PageCache:
    """
    A webpage cache.

    Avoids overloading web servers by using locally cached responses if possible.
    """

    filename: str
    cache: Optional[Dict[str, str]]
    changes: int
    lock: threading.Lock

    def __init__(self, filename: str):
        self.filename = filename
        self.cache = None
        self.changes = 0
        self.lock = threading.Lock()

    def load_cache(self) -> None:
        """Load the cache."""
        with self.lock:
            if self.cache is not None:
                return

            try:
                with open(self.filename, "r") as handle:
                    self.cache = json.load(handle)
            except IOError:
                self.cache = {}

    def save(self) -> None:
        """Save the page cache to disk."""
        if self.changes > 0:
            with open(self.filename, "w") as handle:
                json.dump(self.cache, handle)
            self.changes = 0

    def fetch(self, url: str, skip_cache: bool = False) -> str:
        """Fetch a page using the cache."""
        self.load_cache()
        assert self.cache is not None, "failed to load cache"

        if url in self.cache and not skip_cache:
            print(f"Found {url} in cache.")
            return self.cache[url]

        print(f"Requesting {url}.")
        self.cache[url] = requests.get(url).text

        self.changes += 1
        if self.changes % 100 == 0:
            self.save()

        return self.cache[url]


@contextmanager
def open_cache(filename: str) -> Iterator[PageCache]:
    """
    Context manager to open a PageCache.
    """
    cache = PageCache(filename)
    yield cache
    cache.save()


def get_game_basic_metadata(
    cache: PageCache,
    executor: ThreadPoolExecutor,
    *,
    max_rank: Optional[int] = None,
    request_batch_size: int = 50,
) -> List[GameBasicMetadata]:
    """
    Gets the BGG basic metadata for all ranked games on BGG.
    """

    def scrape_page(page: int) -> Tuple[List[GameBasicMetadata], bool]:
        metas: List[GameBasicMetadata] = []
        page_str = cache.fetch(BGG_TOP_RANKED_GAMES_URL.format(page=page))
        parsed = etree.parse(
            BytesIO(page_str.encode()), etree.XMLParser(encoding="utf-8", recover=True)
        )
        rows = parsed.xpath("//tr[@id='row_']")
        assert isinstance(rows, list)

        if not rows:
            return metas, False

        for row in rows:
            assert isinstance(row, XMLElement)
            bgg_page_link = xml_get(
                row, "td[@class='collection_thumbnail']/a[@href]", "href"
            )
            id_str, slug = bgg_page_link.split("/")[2:4]
            description = xml_get_opt(
                row,
                "td[@class='collection_thumbnail']/"
                "td[contains(@class,'collection_objectname')]/p",
                xpath=True,
            )
            rank = xml_get_opt(row, "td[@class='collection_rank']/a[@name]", "name")

            if rank is None or (max_rank and int(rank) > max_rank):
                return metas, False

            metas.append(
                GameBasicMetadata(
                    id=int(id_str),
                    slug=slug,
                    brief_description=description.strip() if description else None,
                )
            )

        return metas, True

    metas: List[GameBasicMetadata] = []
    page_num = 1
    while True:
        results = executor.map(
            scrape_page, range(page_num, page_num + request_batch_size)
        )
        done = False
        for result, more in results:
            metas.extend(result)
            done |= not more

        if done:
            return metas

        page_num += request_batch_size

    raise ValueError("Unreachable")


def get_game_full_metadata(
    cache: PageCache,
    executor: ThreadPoolExecutor,
    metas: List[GameBasicMetadata],
) -> List[Game]:
    """
    Gets the BGG game metadata the given BGG game ids.
    """

    def get_links(item: XMLElement, link_type: str) -> List[EntityLink]:
        links = item.xpath(f"link[@type='{link_type}']")
        assert isinstance(links, list)
        ret = []
        for link in links:
            assert isinstance(link, XMLElement)
            ret.append(
                EntityLink(
                    id=int(xml_get(link, None, "id")), name=xml_get(link, None, "value")
                )
            )
        return ret

    def request_for_chunk(chunk: List[GameBasicMetadata]) -> List[Game]:
        games = []
        id_to_meta = {meta.id: meta for meta in chunk}
        page_str = cache.fetch(
            BGG_THING_API_URL.format(ids=",".join(str(id) for id in id_to_meta.keys()))
        )
        parsed = etree.parse(BytesIO(page_str.encode()))
        items = parsed.xpath("//item[@type='boardgame']")
        assert isinstance(items, list), "invalid xpath query"

        for item in items:
            assert isinstance(item, XMLElement)

            rank_str = xml_get(
                item,
                "statistics/ratings/ranks/rank[@name='boardgame']",
                "value",
            )
            if rank_str == "Not Ranked":
                continue

            item_id = int(xml_get(item, None, "id"))
            weight = float(xml_get(item, "statistics/ratings/averageweight", "value"))
            games.append(
                Game(
                    id=item_id,
                    slug=id_to_meta[item_id].slug,
                    name=xml_get(item, "name[@type='primary']", "value"),
                    thumbnail=xml_get_opt(item, "thumbnail"),
                    description=xml_get_opt(item, "description"),
                    brief_description=id_to_meta[item_id].brief_description,
                    min_players=int(xml_get(item, "minplayers", "value")),
                    max_players=int(xml_get(item, "maxplayers", "value")),
                    expected_playtime=int(xml_get(item, "playingtime", "value")),
                    min_playtime=int(xml_get(item, "minplaytime", "value")),
                    max_playtime=int(xml_get(item, "maxplaytime", "value")),
                    min_age=int(xml_get(item, "minage", "value")),
                    rank=int(rank_str),
                    rating=float(xml_get(item, "statistics/ratings/average", "value")),
                    num_ratings=int(
                        xml_get(item, "statistics/ratings/usersrated", "value")
                    ),
                    weight=weight if weight != 0 else None,
                    year_published=int(xml_get(item, "yearpublished", "value")),
                    categories=get_links(item, "boardgamecategory"),
                    mechanics=get_links(item, "boardgamemechanic"),
                    families=get_links(item, "boardgamefamily"),
                    expansions=get_links(item, "boardgameexpansion"),
                )
            )

        return games

    games = []
    results = executor.map(request_for_chunk, chunked(metas, API_BATCH_SIZE))
    for result in results:
        games.extend(result)

    return games


def get_tags_from_games(games: List[Game]) -> List[Tag]:
    """
    Get all the tags found in a list of games.
    """
    seen = {}
    tags = []

    def tag_from_entity_link(
        entities: List[EntityLink], tag_type: TagType
    ) -> Iterator[Tag]:
        for entity in entities:
            yield Tag(id=entity.id, name=entity.name, type=tag_type)

    for game in games:
        for tag in [
            *tag_from_entity_link(game.mechanics, "mechanic"),
            *tag_from_entity_link(game.categories, "category"),
        ]:
            if tag.id not in seen:
                tags.append(tag)
                seen[tag.id] = tag.name
            else:
                assert seen[tag.id] == tag.name, "found different tags with the same id"

    return tags


@click.group()
def main() -> None:
    """
    Scrape board game metdata from BoardGameGeek (BGG) and ingest it into Elasticsearch.
    """
    pass


@main.command("run")
@click.option(
    "--connection",
    help="Elasticsearch connection string.",
)
@click.option(
    "--connection-from-env",
    is_flag=True,
    help=f"Read Elasticsearch connection string from env var '{CONNECTION_ENV_VAR}'.",
)
@click.option(
    "--dry-run", is_flag=True, help="Skip ingesting into the database (scraping only)."
)
@click.option(
    "--max-rank",
    type=int,
    help="The max rank (on BGG) of the board games to scrape.",
)
@click.option(
    "--drop-index",
    is_flag=True,
    help="Drop the Elasticsearch index before indexing new data.",
)
@click.option(
    "--cache",
    "cache_path",
    default=".bggcache.json",
    type=click.Path(),
    help="BGG cache file path.",
)
@click.option(
    "--scrape-threads", default=10, help="Number of threads to use for scraping BGG."
)
@click.option(
    "--ingest-threads",
    default=2,
    help="Number of threads to use updating the Elasticsearch index.",
)
def run_ingest(
    connection: Optional[str],
    connection_from_env: bool,
    dry_run: bool,
    max_rank: Optional[int],
    drop_index: bool,
    cache_path: str,
    scrape_threads: int,
    ingest_threads: int,
) -> None:
    """
    Scrape board game metadata from BoardGameGeek (BGG).
    """
    if not connection and not connection_from_env and not dry_run:
        die(
            "Error: at least one of options '--connection', '--connection-from-env', "
            "or '--dry-run' are required."
        )

    if connection and connection_from_env:
        die("Error: cannot set both '--connection' and '--connection-from-env'.")

    if connection_from_env:
        connection = os.getenv(CONNECTION_ENV_VAR)
        if not connection:
            die(
                "Error: '--connection-from-env' set but could not find env var "
                f"'{CONNECTION_ENV_VAR}'."
            )

    es = Elasticsearch(connection) if connection else None

    print("Scraping BGG metadata...")
    with open_cache(cache_path) as cache:
        with ThreadPoolExecutor(max_workers=scrape_threads) as executor:
            metas = get_game_basic_metadata(
                cache, executor, max_rank=max_rank, request_batch_size=scrape_threads
            )
            games = get_game_full_metadata(cache, executor, metas)

    tags = get_tags_from_games(games)

    if not dry_run:
        assert es is not None, "elasticsearch connection required"
        if drop_index:
            print("Dropping old Elasticsearch index...")
            es.indices.delete(index=ES_GAME_INDEX_NAME, ignore=[400, 404])
            es.indices.delete(index=ES_TAG_INDEX_NAME, ignore=[400, 404])
        es.indices.create(index=ES_GAME_INDEX_NAME, ignore=400)
        es.indices.create(index=ES_TAG_INDEX_NAME, ignore=400)

    def objects_to_delete(index: str, exclude: List[int]) -> Iterator[Tuple[str, str]]:
        """
        Finds all the old games (from previous indexing) that should be deleted.

        Returns an iterator of tuples containing the game id and game name.
        """
        if es is None:
            return

        count = 0
        while True:
            res = es.search(
                index=index,
                body={
                    "_source": ["name"],
                    "from": count,
                    "size": ES_MAX_SEARCH_WINDOW,
                    "query": {"bool": {"must_not": [{"ids": {"values": exclude}}]}},
                },
            )
            hits = res["hits"]["hits"]
            yield from [(hit["_id"], hit["_source"]["name"]) for hit in hits]

            count += len(hits)
            if len(hits) < ES_MAX_SEARCH_WINDOW:
                return

    def index_actions() -> Iterator[Dict[str, Any]]:
        """
        Generator of elasticsearch indexing actions.
        """

        def index_objects(
            objs: List[GameOrTagType], index: str
        ) -> Iterator[Dict[str, Any]]:
            for i, obj in enumerate(objs):
                print(
                    f"{'(dry run) ' if dry_run else ''}"
                    f"Indexing '{obj.name}' ({i + 1}/{len(objs)})..."
                )

                doc = obj._asdict()
                for key in doc:
                    if isinstance(doc[key], list):
                        doc[key] = [link._asdict() for link in doc[key]]

                yield {
                    "_op_type": "index",
                    "_id": obj.id,
                    "_index": index,
                    **doc,
                }

        def delete_objects(
            to_delete: Iterable[Tuple[str, str]],
            index: str,
        ) -> Iterator[Dict[str, Any]]:
            for iden, name in to_delete:
                print(
                    f"{'(dry run) ' if dry_run else ''}"
                    f"Deleting '{name}' ({iden})..."
                )
                yield {"_op_type": "delete", "_id": iden, "_index": index}

        print("Indexing games...")
        yield from index_objects(games, ES_GAME_INDEX_NAME)
        yield from delete_objects(
            to_delete=objects_to_delete(
                index=ES_GAME_INDEX_NAME, exclude=[game.id for game in games]
            ),
            index=ES_GAME_INDEX_NAME,
        )

        print("Indexing tags...")
        yield from index_objects(tags, ES_TAG_INDEX_NAME)
        yield from delete_objects(
            to_delete=objects_to_delete(
                index=ES_TAG_INDEX_NAME, exclude=[tag.id for tag in tags]
            ),
            index=ES_TAG_INDEX_NAME,
        )

    print("Ingesting BGG metadata into Elasticsearch...")
    if not dry_run:
        assert es is not None, "elasticsearch connection required"
        deque(
            elasticsearch.helpers.parallel_bulk(
                es, index_actions(), thread_count=ingest_threads
            ),
            maxlen=0,
        )
    else:
        deque(index_actions(), maxlen=0)

    if not dry_run:
        assert es is not None, "elasticsearch connection required"
        es.indices.refresh(index=ES_GAME_INDEX_NAME)


@main.command("query")
@click.argument("query_string")
@click.option(
    "--connection",
    required=True,
    help="Elastic search connection string.",
)
@click.option("--offset", default=0, help="Offset in query results.")
@click.option("--limit", default=10, help="Number of query results.")
def run_query(query_string: str, connection: str, offset: int, limit: int) -> None:
    """
    Query Elasticsearch for ingested BoardGameGeek (BGG) metadata.
    """
    es = Elasticsearch(connection)
    res = es.search(
        index=ES_GAME_INDEX_NAME,
        body={
            "from": offset,
            "size": limit,
            "query": {
                "query_string": {
                    "query": query_string,
                    "default_field": "name",
                },
            },
        },
    )

    total = res["hits"]["total"]["value"]
    for i, hit in enumerate(res["hits"]["hits"]):
        if i != 0:
            print()
        print(f"Hit {i + 1 + offset}/{total}:")
        for key, value in hit["_source"].items():
            print(f"\t{key}: {value}")


if __name__ == "__main__":
    main()  # pylint: disable=no-value-for-parameter
