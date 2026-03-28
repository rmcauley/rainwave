from psycopg import sql

from api import rainwave_dto
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from common.db.build_insert import build_insert_on_conflict_do_update
from common.db.cursor import get_cursor


@handle_api_url("fave_album")
class SubmitAlbumFave(RegisteredUserAPIHandler):
    sid_required = True
    description = "Fave or un-fave an album, specific to the station the request is being made on."
    sync_across_sessions = True

    @property
    def return_name(cls) -> RainwaveResponseKey:
        return "fave_album_result"

    async def post(self) -> None:
        input = self.get_validated_input(rainwave_dto.Api4FaveAlbumPostRequest)
        async with get_cursor() as cursor:
            album_id = await cursor.fetch_var(
                "SELECT album_id FROM r4_album_sid WHERE album_id = %s AND sid = %s",
                (input.album_id, self.sid),
                var_type=int,
            )
            if not album_id:
                raise APIException("album_does_not_exist")
            to_upsert = {
                "album_id": album_id,
                "user_id": self.user.id,
                "album_fave": input.fave,
            }
            await cursor.update(
                build_insert_on_conflict_do_update(
                    "r4_album_faves",
                    to_upsert,
                    sql.SQL("(user_id, album_id)"),
                ),
                to_upsert,
            )

            text: str | None = None
            if input.fave:
                text = "Favourited album."
            else:
                text = "Unfavourited album."

            self.response["fave_album_result"] = {
                "fave": input.fave,
                "id": album_id,
                "sid": self.sid,
                "success": True,
                "text": text,
                "tl_key": "success",
            }
