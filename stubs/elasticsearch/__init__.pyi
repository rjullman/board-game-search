from typing import Any, Dict, List, TypedDict, Union


class SearchResultHitsTotal(TypedDict):
    value: int


class SearchResultHit(TypedDict):
    _id: str
    _source: Dict[str, Any]


class SearchResultHits(TypedDict):
    total: SearchResultHitsTotal
    hits: List[SearchResultHit]


class SearchResult(TypedDict):
    hits: SearchResultHits


class Cluster:
    def put_component_template(self, *, name: str, body: Dict[str, Any]) -> None:
        ...


class Indices:
    def refresh(self, index: str) -> None:
        ...

    def create(self, *, index: str, ignore: Union[int, List[int]]) -> None:
        ...

    def delete(self, *, index: str, ignore: Union[int, List[int]]) -> None:
        ...

    def put_index_template(self, *, name: str, body: Dict[str, Any]) -> None:
        ...


class Elasticsearch:
    cluster: Cluster
    indices: Indices

    def __init__(self, conn: str) -> None:
        ...

    def index(self, *, index: str, id: int, body: Dict[str, Union[str, int]]) -> None:
        ...

    def search(self, *, index: str, body: Dict[str, Any]) -> SearchResult:
        ...
