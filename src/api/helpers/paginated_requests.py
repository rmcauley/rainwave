from psycopg import sql
from tornado.web import RequestHandler

from api import fieldtypes

DEFAULT_PAGE_LIMIT = 1000


def get_pagination_params(
    request: RequestHandler, max_per_page: int = DEFAULT_PAGE_LIMIT
) -> tuple[int, int]:
    limit = max_per_page
    limit_argument = fieldtypes.integer(request.get_argument("per_page"))
    if limit_argument:
        limit = min(limit, limit_argument)

    offset = 0
    offset_argument = fieldtypes.integer(request.get_argument("page_start"))
    if offset_argument:
        offset = min(limit, offset_argument)

    return (limit, offset)


def get_pagination_sql_limit_string(
    request: RequestHandler, max_per_page: int = DEFAULT_PAGE_LIMIT
) -> sql.Composed:
    (limit, offset) = get_pagination_params(request, max_per_page)

    return sql.SQL(" LIMIT {limit} OFFSET {offset}").format(
        limit=sql.Literal(limit),
        offset=sql.Literal(offset),
    )
