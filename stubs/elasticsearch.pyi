from typing import Any, Dict, List, TypedDict, Union


class SearchResultHitsTotal(TypedDict):
    value: int


class SearchResultHit(TypedDict):
    _source: Dict[str, Union[str, int]]


class SearchResultHits(TypedDict):
    total: SearchResultHitsTotal
    hits: List[SearchResultHit]


class SearchResult(TypedDict):
    hits: SearchResultHits


class Indices:
    def refresh(self, index: str) -> None:
        ...

    def create(self, *, index: str, ignore: int) -> None:
        ...


class Elasticsearch:
    indices: Indices

    def __init__(self, conn: str) -> None:
        ...

    def index(self, *, index: str, id: int, body: Dict[str, Union[str, int]]) -> None:
        ...

    def search(self, *, index: str, body: Dict[str, Any]) -> SearchResult:
        ...
