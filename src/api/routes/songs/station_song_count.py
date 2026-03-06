from api.handler_classes.api_handler_with_get import APIHandlerWithGet


@handle_api_url("station_song_count")
class StationSongCountRequest(APIHandlerWithGet):
    description = "Get the total number of songs in the playlist on each station."
    return_name = "station_song_count"
    login_required = False
    sid_required = False

    def post(self):
        self.append(
            self.return_name,
            await cursor.fetch_all(
                """
                SELECT
                    song_origin_sid AS sid,
                    COUNT(song_id) AS song_count
                FROM r4_songs
                WHERE song_verified = TRUE
                GROUP BY song_origin_sid
"""
            ),
        )
