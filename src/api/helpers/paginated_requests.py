from psycopg import sql
from tornado.web import RequestHandler

from api import fieldtypes

DEFAULT_PAGE_LIMIT = 100
MAX_PAGE_LIMIT = 1000
DEFAULT_COLLECTION_PAGE_LIMIT = 1000


def get_pagination_params(
    request: RequestHandler,
    default_per_page: int = DEFAULT_PAGE_LIMIT,
    max_per_page: int = MAX_PAGE_LIMIT,
) -> tuple[int, int]:
    limit = default_per_page
    limit_argument = fieldtypes.positive_integer(request.get_argument("per_page", None))
    if limit_argument is not None:
        limit = min(max_per_page, limit_argument)

    offset = 0
    offset_argument = fieldtypes.zero_or_greater_integer(
        request.get_argument("page_start", None)
    )
    if offset_argument is not None:
        offset = offset_argument

    return (limit, offset)


def get_pagination_sql_limit_string(
    request: RequestHandler,
    default_per_page: int = DEFAULT_PAGE_LIMIT,
    max_per_page: int = MAX_PAGE_LIMIT,
) -> sql.Composed:
    (limit, offset) = get_pagination_params(request, default_per_page, max_per_page)

    return sql.SQL(" LIMIT {limit} OFFSET {offset}").format(
        limit=sql.Literal(limit),
        offset=sql.Literal(offset),
    )
