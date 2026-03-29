from api import rainwave_typeddicts
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.rainwave_dto import Api4AdminAlbumSongsPostRequest
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from common.db.cursor import get_cursor


@handle_api_url("admin/album_songs")
class AdminAlbumSongs(APIHandler):
    admin_required = True
    sid_required = False

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "admin_album_songs"

    async def post(self) -> None:
        input = self.get_validated_input(Api4AdminAlbumSongsPostRequest)
        async with get_cursor() as cursor:
            self.response["admin_album_songs"] = await cursor.fetch_all(
                """
                SELECT
                    r4_songs.song_id AS song_id,
                    r4_songs.song_filename AS song_filename,
                    r4_songs.song_cool_multiply AS song_cool_multiply,
                    r4_songs.song_cool_override AS song_cool_override,
                    (
                        r4_song_sid.song_request_only = TRUE
                        AND r4_song_sid.song_request_only_end IS NULL
                    ) AS song_request_only
                FROM r4_songs
                    JOIN r4_song_sid USING (song_id)
                WHERE
                    r4_songs.album_id = %s
                    AND r4_song_sid.sid = %s
                    AND r4_song_sid.song_exists = TRUE
                ORDER BY
                    r4_songs.song_disc_number,
                    r4_songs.song_track_number,
                    r4_songs.song_filename
                """,
                (input.album_id, input.sid),
                row_type=rainwave_typeddicts.AdminAlbumSong,
            )
