from psycopg import sql
from api import rainwave_dto
from api.exceptions import APIException
from api.handle_url import handle_api_url


from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from common.db.cursor import get_cursor


@handle_api_url("fave_all_songs")
class SubmitFaveAllSongs(RegisteredUserAPIHandler):
    sid_required = True
    perks_required = True
    description = "Faves or un-faves all songs in an album.  Only songs on station ID provided will be faved."

    @property
    def return_name(cls) -> RainwaveResponseKey:
        return "fave_all_songs_result"

    async def post(self):
        input = self.get_validated_input(rainwave_dto.Api4FaveAllSongsPostRequest)
        async with get_cursor() as cursor:
            album_id = await cursor.fetch_var(
                "SELECT album_id FROM r4_album_sid WHERE album_id = %s AND sid = %s",
                (input.album_id, self.sid),
                var_type=int,
            )
            if not album_id:
                raise APIException("album_does_not_exist")

            song_ids = await cursor.fetch_list(
                "SELECT r4_song_sid.song_id FROM r4_songs JOIN r4_song_sid USING (song_id) WHERE album_id = %s AND sid = %s",
                (input.album_id, self.sid),
                row_type=int,
            )

            insert_rows = [(song_id, self.user.id, input.fave) for song_id in song_ids]

            await cursor.update(
                sql.SQL(
                    """
                INSERT INTO r4_song_ratings (song_id, user_id, song_fave) VALUES {values}
                ON CONFLICT (user_id, song_id) DO UPDATE
                SET song_fave = EXCLUDED.song_fave
                """
                ).format(
                    values=sql.SQL(", ").join(sql.SQL("(%s, %s, %s)") for _ in song_ids)
                ),
                [v for row in insert_rows for v in row],
            )

            self.response["fave_all_songs_result"] = {
                "fave": input.fave,
                "sid": self.sid,
                "song_ids": song_ids,
                "success": True,
                "text": "Fave status for all songs changed.",
                "tl_key": "success",
            }
