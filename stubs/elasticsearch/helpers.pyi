from typing import Any, Iterator, Literal, Optional, Tuple, TypedDict

from elasticsearch import Elasticsearch


class Action(TypedDict):
    _op_type: Optional[Literal["index"]]
    _id: int
    _index: str
    doc: Any


Success = bool
Info = Any
def parallel_bulk(
    es: Elasticsearch,
    actions: Iterator[Action],
    *,
    thread_count: int,
) -> Iterator[Tuple[Success, Info]]: ...
