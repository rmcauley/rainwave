@handle_api_url("user_requested_history")
class AllRequestedSongs(APIHandler):
    description = "Shows the user's completed requests."
    return_name = "user_requested_history"
    login_required = True
    sid_required = True
    pagination = True

    def post(self):
        self.append(
            self.return_name,
            await cursor.fetch_all(
                """
                SELECT
                    r4_songs.song_id AS id,
                    song_title AS title,
                    album_name,
                    CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating,
                    song_rating_user AS rating_user,
                    song_fave AS fave
                FROM r4_request_history
                    JOIN r4_song_sid USING (song_id, sid)
                    JOIN r4_songs USING (song_id)
                    JOIN r4_albums USING (album_id)
                    LEFT JOIN r4_song_ratings ON (
                        r4_songs.song_id = r4_song_ratings.song_id AND 
                        r4_song_ratings.user_id = r4_request_history.user_id
                    )
                WHERE r4_request_history.sid = %s
                    AND r4_request_history.user_id = %s
                    AND song_verified = TRUE
                ORDER BY request_fulfilled_at DESC
"""
                + self.get_sql_limit_string(),
                (self.sid, self.user.id),
            ),
        )


@handle_api_html_url("user_requested_history")
class AllRequestedSongsHTML(PrettyPrintAPIMixin, AllRequestedSongs):
    pass
