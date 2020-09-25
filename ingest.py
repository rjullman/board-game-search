"""
Download and process board game data from BoardGameGeek (BGG).
"""

import itertools
import json
import sys
from contextlib import contextmanager
from io import BytesIO
from typing import Dict, Iterable, Iterator, List, NamedTuple, Optional, TypeVar

import click
import requests
from elasticsearch import Elasticsearch
from lxml import etree
from lxml.etree import _Element as XMLElement

T = TypeVar("T")

BGG_TOP_RANKED_GAMES_URL = "https://boardgamegeek.com/browse/boardgame/page/{page}"
BGG_THING_API_URL = "https://boardgamegeek.com/xmlapi2/thing?stats=1&id={ids}"

API_BATCH_SIZE = 1000

ES_INDEX_NAME = "boardgames"


class GameBasicMetadata(NamedTuple):
    """
    Basic metadata for a BGG board game.

    This metadata is scraped during game discovery before populating other metdata.
    """

    id: int  # BGG board game id.
    slug: str  # BGG board game slug.
    buy_link: Optional[str]


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
    expected_playtime: int
    min_players: int
    max_players: int
    min_playtime: int
    max_playtime: int
    min_age: int
    rank: int
    rating: float
    weight: float
    year_published: int
    buy_link: Optional[str]
    categories: List[EntityLink]
    mechanics: List[EntityLink]
    families: List[EntityLink]
    expansions: List[EntityLink]


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
    item: XMLElement, path: Optional[str] = None, attr: Optional[str] = None
) -> Optional[str]:
    """
    Helper for LXML to get an attribute at a path from an XML element.

    Returns None if the path or attribute do not exist.
    """
    elem = item.find(path) if path else item
    if elem is None:
        return None
    ret = elem.get(attr) if attr else elem.text
    if ret is None:
        return None
    if isinstance(ret, bytes):
        raise ValueError("Expected result to be a str not bytes.")
    return ret


def xml_get(
    item: XMLElement, path: Optional[str] = None, attr: Optional[str] = None
) -> str:
    """
    Helper for LXML to get an attribute at a path from an XML element.

    Raises a ValueError if the path or attribute do not exist.
    """
    ret = xml_get_opt(item, path, attr)
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

    def __init__(self, filename: str):
        self.filename = filename
        self.cache = None
        self.changes = 0

    def load_cache(self) -> None:
        """Load the cache."""
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


def get_game_basic_metadata(cache: PageCache) -> List[GameBasicMetadata]:
    """
    Gets the BGG basic metadata for all ranked games on BGG.
    """
    metas: List[GameBasicMetadata] = []
    page_num = 0
    while True:
        page_num += 1
        page_str = cache.fetch(BGG_TOP_RANKED_GAMES_URL.format(page=page_num))
        parsed = etree.parse(
            BytesIO(page_str.encode()), etree.XMLParser(encoding="utf-8", recover=True)
        )
        rows = parsed.xpath("//tr[@id='row_']")
        assert isinstance(rows, list)

        for row in rows:
            assert isinstance(row, XMLElement)
            bgg_page_link = xml_get(
                row, "td[@class='collection_thumbnail']/a[@href]", "href"
            )
            id_str, slug = bgg_page_link.split("/")[2:4]
            buy_link = xml_get_opt(
                row,
                "td[@class='collection_shop']/div/div/div/a[@class='ulprice']",
                "href",
            )
            rank = xml_get_opt(row, "td[@class='collection_rank']/a[@name]", "name")

            if rank is None:
                return metas

            metas.append(
                GameBasicMetadata(id=int(id_str), slug=slug, buy_link=buy_link)
            )

    raise ValueError("Unreachable")


def get_game_full_metadata(
    cache: PageCache, metas: List[GameBasicMetadata]
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

    games = []
    for chunk in chunked(metas, API_BATCH_SIZE):
        id_to_meta = {meta.id: meta for meta in chunk}
        page_str = cache.fetch(
            BGG_THING_API_URL.format(ids=",".join(str(id) for id in id_to_meta.keys()))
        )
        parsed = etree.parse(BytesIO(page_str.encode()))
        items = parsed.xpath("//item[@type='boardgame']")
        assert isinstance(items, list), "invalid xpath query"

        for item in items:
            assert isinstance(item, XMLElement)
            item_id = int(xml_get(item, None, "id"))
            games.append(
                Game(
                    id=item_id,
                    slug=id_to_meta[item_id].slug,
                    name=xml_get(item, "name[@type='primary']", "value"),
                    thumbnail=xml_get_opt(item, "thumbnail"),
                    description=xml_get_opt(item, "description"),
                    min_players=int(xml_get(item, "minplayers", "value")),
                    max_players=int(xml_get(item, "maxplayers", "value")),
                    expected_playtime=int(xml_get(item, "playingtime", "value")),
                    min_playtime=int(xml_get(item, "minplaytime", "value")),
                    max_playtime=int(xml_get(item, "maxplaytime", "value")),
                    min_age=int(xml_get(item, "minage", "value")),
                    rank=int(
                        xml_get(
                            item,
                            "statistics/ratings/ranks/rank[@name='boardgame']",
                            "value",
                        )
                    ),
                    rating=float(xml_get(item, "statistics/ratings/average", "value")),
                    weight=float(
                        xml_get(item, "statistics/ratings/averageweight", "value")
                    ),
                    year_published=int(xml_get(item, "yearpublished", "value")),
                    buy_link=id_to_meta[item_id].buy_link,
                    categories=get_links(item, "boardgamecategory"),
                    mechanics=get_links(item, "boardgamemechanic"),
                    families=get_links(item, "boardgamefamily"),
                    expansions=get_links(item, "boardgameexpansion"),
                )
            )

    return games


@click.group()
def main() -> None:
    """
    Scrape board game metdata from BoardGameGeek (BGG) and ingest it into Elasticsearch.
    """
    pass


@main.command("run")
@click.option(
    "--connection",
    help="Elastic search connection string.",
)
@click.option(
    "--dry-run", is_flag=True, help="Skip ingesting into the database (scraping only)."
)
@click.option(
    "--cache",
    "cache_path",
    default=".bggcache.json",
    type=click.Path(),
    help="BGG cache file path.",
)
def run_ingest(connection: Optional[str], dry_run: bool, cache_path: str) -> None:
    """
    Scrape board game metadata from BoardGameGeek (BGG).
    """
    if not connection and not dry_run:
        die(
            "Error: at least one of options '--connection' or '--dry-run' are required."
        )

    es = Elasticsearch(connection) if connection else None

    with open_cache(cache_path) as cache:
        print("Scraping BGG metadata...")
        metas = get_game_basic_metadata(cache)
        games = get_game_full_metadata(cache, metas)

    print("Ingesting BGG metadata into elastic search...")
    for i, game in enumerate(games):
        print(
            f"{'(dry run)' if dry_run else ''} "
            f"Ingesting '{game.name}' ({i + 1}/{len(games)})..."
        )

        if not dry_run:
            assert es is not None, "elasticsearch connection required"
            body = game._asdict()
            for key in ["categories", "families", "mechanics", "expansions"]:
                body[key] = [link._asdict() for link in body[key]]
            es.index(index=ES_INDEX_NAME, id=game.id, body=body)

    if not dry_run:
        assert es is not None, "elasticsearch connection required"
        es.indices.refresh(index=ES_INDEX_NAME)


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
        index=ES_INDEX_NAME,
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
