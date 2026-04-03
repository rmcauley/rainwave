from api import rainwave_typeddicts
from api.handle_url import handle_api_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.handler_classes.api_handler import APIHandler
from common.db.cursor import get_cursor


@handle_api_url("station_song_count")
class StationSongCountRequest(APIHandler):
    description = "Get the total number of songs in the playlist on each station."

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "station_song_count"

    login_required = False
    sid_required = False

    async def post(self):
        async with get_cursor() as cursor:
            self.response["station_song_count"] = await cursor.fetch_all(
                """
                SELECT
                    song_origin_sid AS sid,
                    COUNT(song_id) AS song_count
                FROM r4_songs
                WHERE song_verified = TRUE
                GROUP BY song_origin_sid
                """,
                row_type=rainwave_typeddicts.StationSongCountItem,
            )
