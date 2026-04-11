from api import rainwave_typeddicts
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.routes.albums.all_albums_paginated import get_all_albums_list_sql
from common.db.cursor import get_cursor
from psycopg import sql


@handle_api_url("all_albums")
class AllAlbumsHandler(APIHandler):
    description = "Returns all albums on the station playlist."

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "all_albums"

    async def post(self):
        async with get_cursor() as cursor:
            user_id = self.optional_user.id if self.optional_user else 1
            self.response["all_albums"] = await cursor.fetch_all(
                sql.SQL("{query} ORDER BY name").format(
                    query=get_all_albums_list_sql(user_id)
                ),
                {"sid": self.sid, "user_id": user_id},
                row_type=rainwave_typeddicts.AlbumInList,
            )
