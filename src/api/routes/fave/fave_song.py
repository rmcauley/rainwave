from api import rainwave_dto
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from common.db.cursor import get_cursor


@handle_api_url("fave_song")
class SubmitSongFave(RegisteredUserAPIHandler):
    login_required = True
    tunein_required = False
    sid_required = False
    description = "Fave or un-fave a song."
    sync_across_sessions = True

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
            await cursor.update(
                """
                INSERT INTO r4_song_ratings (song_id, user_id, song_fave) VALUES (%s, %s, %s)
                ON CONFLICT DO UPDATE SET song_fave = %s
                """,
                (song_id, self.user.id, input.fave, input.fave),
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
                "tl_key": "fave_success",
            }
