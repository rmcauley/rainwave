from psycopg import sql

from api import rainwave_dto
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from common.db.build_insert import build_insert_on_conflict_do_update
from common.db.cursor import get_cursor


@handle_api_url("fave_song")
class SubmitSongFave(RegisteredUserAPIHandler):
    login_required = True
    tunein_required = False
    sid_required = False
    description = "Fave or un-fave a song."
    sync_across_sessions = True

    @property
    def return_name(cls) -> RainwaveResponseKey:
        return "fave_song_result"

    async def post(self) -> None:
        input = self.get_validated_input(rainwave_dto.Api4FaveSongPostRequest)
        async with get_cursor() as cursor:
            song_id = await cursor.fetch_var(
                "SELECT song_id FROM r4_songs WHERE song_id = %s AND song_verified = TRUE",
                (input.song_id,),
                var_type=int,
            )
            if not song_id:
                raise APIException("song_does_not_exist")
            to_upsert = {
                "song_id": song_id,
                "user_id": self.user.id,
                "song_fave": input.fave,
            }
            await cursor.update(
                build_insert_on_conflict_do_update(
                    "r4_song_ratings",
                    to_upsert,
                    sql.SQL("(user_id, song_id)"),
                ),
                to_upsert,
            )

            text: str | None = None
            if input.fave:
                text = "Favourited song."
            else:
                text = "Unfavourited song."

            self.response["fave_song_result"] = {
                "fave": input.fave,
                "id": song_id,
                "sid": self.sid,
                "success": True,
                "text": text,
                "tl_key": "success",
            }
