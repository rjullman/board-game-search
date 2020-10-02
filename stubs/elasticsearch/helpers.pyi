from typing import Any, Dict, Iterator, Literal, Optional, Tuple

from elasticsearch import Elasticsearch

Success = bool
Info = Any
def parallel_bulk(
    es: Elasticsearch,
    actions: Iterator[Dict[str, Any]],
    *,
    thread_count: int,
) -> Iterator[Tuple[Success, Info]]: ...
