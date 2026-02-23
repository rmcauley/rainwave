@handle_api_url("top_100")
class Top100Songs(APIHandler):
    description = "Get the 100 highest-rated songs on the entirety of Rainwave, or by station if a station ID is specified in the arguments."
    return_name = "top_100"
    login_required = False
    sid_required = False
    allow_get = True

    def post(self):
        if "sid" in self.request.arguments:
            self.append(
                self.return_name,
                await cursor.fetch_all(
                    """
                    SELECT
                        DISTINCT ON (song_rating, song_id) 
                        song_origin_sid AS origin_sid,
                        song_id AS id,
                        song_title AS title,
                        album_name,
                        CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS song_rating,
                        song_rating_count
                    FROM r4_song_sid
                        JOIN r4_songs USING (song_id)
                        JOIN r4_albums USING (album_id)
                    WHERE 
                        r4_song_sid.sid = %s
                        AND song_rating_count > 20
                        AND song_verified = TRUE
                    ORDER BY 
                        song_rating DESC,
                        song_id,
                        song_rating_count DESC,
                        song_id
                    LIMIT 100
""",
                    (self.sid,),
                ),
            )
        else:
            self.append(
                self.return_name,
                await cursor.fetch_all(
                    """
                    SELECT
                        DISTINCT ON (song_rating, song_id) 
                        song_origin_sid AS origin_sid,
                        song_id AS id,
                        song_title AS title,
                        album_name,
                        CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS song_rating,
                        song_rating_count
                    FROM r4_songs
                        JOIN r4_song_sid USING (song_id)
                        JOIN r4_albums USING (album_id)
                    WHERE 
                        song_rating_count > 20
                        AND song_verified = TRUE
                    ORDER BY 
                        song_rating DESC,
                        song_id
                    LIMIT 100
"""
                ),
            )


@handle_api_html_url("top_100")
class Top100SongsHTML(PrettyPrintAPIMixin, Top100Songs):
    pass
