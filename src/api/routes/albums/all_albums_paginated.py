import math

from api import fieldtypes
from api import rainwave_typeddicts
from psycopg import sql
from api.helpers.paginated_requests import DEFAULT_PAGE_LIMIT as PAGE_LIMIT
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler

from common.rainwave import playlist
from common.db.cursor import get_cursor


@handle_api_url("all_albums_paginated")
class AllAlbumsPaginatedHandler(APIHandler):
    description = "Returns chunks of a list of all albums on the station playlist."
    return_name = "all_albums_paginated"
    fields = {"after": (fieldtypes.integer, False)}

    async def post(self):
        async with get_cursor() as cursor:
            base_sql, args = playlist.get_all_albums_list_sql(self.sid, self.user)
            offset = self.get_argument_int("after", 0) or 0
            args = args + (offset,)
            albums = await cursor.fetch_all(
                sql.SQL(
                    "{query} ORDER BY album_name LIMIT {page_limit} OFFSET %s"
                ).format(
                    query=sql.SQL(base_sql),
                    page_limit=sql.Literal(PAGE_LIMIT),
                ),
                args,
                row_type=rainwave_typeddicts.AlbumInList,
            )
            self.response["all_albums_paginated"] = {
                "data": albums,
                "has_more": albums and len(albums) == PAGE_LIMIT,
                "progress": min(
                    math.ceil(
                        (offset + len(albums)) / playlist.num_albums[self.sid] * 100
                    ),
                    100,
                ),
                "next": offset + PAGE_LIMIT,
            },
