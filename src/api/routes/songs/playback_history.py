import orjson

from api.handler_classes.api_handler import APIHandler
from api import rainwave_typeddicts
from api.handle_url import handle_api_html_url, handle_api_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.helpers.paginated_requests import get_pagination_sql_limit_string
from common.db.cursor import get_cursor
from psycopg import sql

from common.libs.pretty_date import pretty_date

@handle_api_url("playback_history")
class PlaybackHistory(APIHandler):
    description = "Get the last 100 songs that played on the station."

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "playback_history"
    login_required = False
    sid_required = True
    pagination = True

    async def post(self):
        async with get_cursor() as cursor:
            if not self.optional_user or self.optional_user.is_anonymous():
                self.response["playback_history"] = await cursor.fetch_all(
                    sql.SQL(
                        """
                        SELECT
                            r4_song_history.song_id AS id,
                            song_title AS title,
                            album_id,
                            album_name,
                            songhist_time AS song_played_at,
                            song_artist_parseable AS artist_parseable,
                            CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating
                        FROM r4_song_history
                        JOIN r4_song_sid USING (song_id, sid)
                        JOIN r4_songs USING (song_id)
                        JOIN r4_albums USING (album_id)
                        WHERE r4_song_history.sid = %s
                        ORDER BY songhist_id DESC
                        """
                    )
                    + get_pagination_sql_limit_string(self),
                    (self.sid,),
                    row_type=rainwave_typeddicts.PlaybackHistoryEntry,
                )
            else:
                self.response["playback_history"] = await cursor.fetch_all(
                    sql.SQL(
                        """
                        SELECT
                            r4_song_history.song_id AS id,
                            song_title AS title,
                            album_id,
                            album_name,
                            song_rating_user AS rating_user,
                            song_fave AS fave,
                            songhist_time AS song_played_at,
                            song_artist_parseable AS artist_parseable,
                            CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating,
                            song_rating_user AS rating_user
                        FROM r4_song_history
                        JOIN r4_song_sid USING (song_id, sid)
                        JOIN r4_songs USING (song_id)
                        JOIN r4_albums USING (album_id)
                        LEFT JOIN r4_song_ratings
                            ON r4_song_history.song_id = r4_song_ratings.song_id AND user_id = %s
                        WHERE r4_song_history.sid = %s
                        ORDER BY songhist_id DESC
                        """
                    )
                    + get_pagination_sql_limit_string(self),
                    (self.optional_user.id, self.sid),
                    row_type=rainwave_typeddicts.PlaybackHistoryEntry,
                )

@handle_api_html_url("playback_history")
class PlaybackHistoryHTML(PlaybackHistory):
    pretty_print_html = True
    login_required = False
    auth_required = False

    columns = ["title", "album_name"]

    def header_special(self):
        self.write("<th>Artist(s)</th>")
        self.write("<th>Site Rating</th>")
        self.write("<th>Your Rating</th>")
        self.write("<th>Time Played</th>")

    def row_special(self, row: rainwave_typeddicts.PlaybackHistoryEntry):
        self.write("<td>")
        artists = orjson.loads(row["artist_parseable"])
        for artist in artists:
            self.write("%s" % artist["name"])
            if artist != artists[-1]:
                self.write(", ")
        self.write("</td>")
        self.write("<td>%s</td>" % row["rating"])
        self.write("<td>%s</td>" % (row["rating_user"] or ""))
        self.write("<td>%s</td>" % pretty_date(row["song_played_at"]))
