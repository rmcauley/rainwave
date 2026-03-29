from api import rainwave_typeddicts
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.rainwave_dto import Api4AdminAlbumsPostRequest
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from common.db.cursor import get_cursor


@handle_api_url("admin/albums")
class AdminAlbums(APIHandler):
    admin_required = True
    sid_required = False

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "admin_albums"

    async def post(self) -> None:
        input = self.get_validated_input(Api4AdminAlbumsPostRequest)
        async with get_cursor() as cursor:
            self.response["admin_albums"] = await cursor.fetch_all(
                """
                SELECT
                    r4_album_sid.album_id AS album_id,
                    r4_albums.album_name AS album_name,
                    r4_album_sid.album_rating AS rating,
                    r4_album_sid.album_rating_count AS rating_count,
                    r4_album_sid.album_cool_multiply AS album_cool_multiply,
                    r4_album_sid.album_cool_override AS album_cool_override
                FROM r4_album_sid
                    JOIN r4_albums USING (album_id)
                WHERE
                    r4_album_sid.sid = %s
                    AND r4_album_sid.album_exists = TRUE
                ORDER BY r4_albums.album_name_searchable, r4_album_sid.album_id
                """,
                (input.sid,),
                row_type=rainwave_typeddicts.AdminAlbum,
            )
