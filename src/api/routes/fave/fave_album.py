from api import rainwave_dto
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from common.db.cursor import get_cursor


@handle_api_url("fave_album")
class SubmitAlbumFave(RegisteredUserAPIHandler):
    sid_required = True
    description = "Fave or un-fave an album, specific to the station the request is being made on."
    sync_across_sessions = True

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
            await cursor.update(
                """
                INSERT INTO r4_album_faves (album_id, user_id, album_fave) VALUES (%s, %s, %s)
                ON CONFLICT DO UPDATE SET album_fave = %s
                """,
                (album_id, self.user.id, input.fave, input.fave),
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
                "tl_key": "fave_success",
            }
        self.write_rainwave_output()
