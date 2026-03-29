from api import rainwave_typeddicts
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.rainwave_dto import Api4AdminAlbumArtPostRequest
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from common.db.cursor import get_cursor


@handle_api_url("admin/album_art")
class AdminAlbumArt(APIHandler):
    admin_required = True
    sid_required = False

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "admin_album_art"

    async def post(self) -> None:
        input = self.get_validated_input(Api4AdminAlbumArtPostRequest)
        async with get_cursor() as cursor:
            self.response["admin_album_art"] = await cursor.fetch_all(
                """
                SELECT
                    sid,
                    album_art_url AS album_art
                FROM r4_album_sid
                WHERE album_id = %s
                ORDER BY sid
                """,
                (input.album_id,),
                row_type=rainwave_typeddicts.AdminAlbumArt,
            )
