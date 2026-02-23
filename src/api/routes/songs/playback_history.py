@handle_api_url("playback_history")
class PlaybackHistory(APIHandler):
    description = "Get the last 100 songs that played on the station."
    return_name = "playback_history"
    login_required = False
    sid_required = True
    allow_get = True
    pagination = True

    def post(self):
        if self.user.is_anonymous():
            self.append(
                self.return_name,
                await cursor.fetch_all(
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
                    + self.get_sql_limit_string(),
                    (self.sid,),
                ),
            )
        else:
            self.append(
                self.return_name,
                await cursor.fetch_all(
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
                    + self.get_sql_limit_string(),
                    (self.user.id, self.sid),
                ),
            )


@handle_api_html_url("playback_history")
class PlaybackHistoryHTML(PrettyPrintAPIMixin, PlaybackHistory):
    login_required = False
    auth_required = False

    columns = ["title", "album_name"]

    def header_special(self):
        self.write("<th>Artist(s)</th>")
        self.write("<th>Site Rating</th>")
        if not self.user.is_anonymous():
            self.write("<th>Your Rating</th>")
        self.write("<th>Time Played</th>")

    def row_special(self, row):
        self.write("<td>")
        artists = json.loads(row["artist_parseable"])
        for artist in artists:
            self.write("%s" % artist["name"])
            if artist != artists[-1]:
                self.write(", ")
        self.write("</td>")

        self.write("<td>%s</td>" % row["rating"])
        if "rating_user" in row:
            self.write("<td>%s</td>" % (row["rating_user"] or ""))

        self.write("<td>%s</td>" % pretty_date(row["song_played_at"]))
