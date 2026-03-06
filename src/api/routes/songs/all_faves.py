from api.handler_classes.api_handler_with_get import APIHandlerWithGet


@handle_api_url("all_faves")
class AllFavHandler(APIHandlerWithGet):
    description = "Get all songs that have been faved by the user."
    return_name = "all_faves"
    login_required = True
    sid_required = False
    pagination = True

    def post(self):
        if "sid" in self.request.arguments:
            self.append(
                self.return_name,
                await cursor.fetch_all(
                    """
                    SELECT
                        r4_song_ratings.song_id AS id,
                        song_title AS title,
                        r4_albums.album_id,
                        album_name,
                        CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating,
                        COALESCE(song_rating_user, 0) AS rating_user,
                        song_fave AS fave,
                        r4_song_sid.song_cool_end AS cool_end
                    FROM r4_song_ratings
                    JOIN r4_song_sid ON (
                        r4_song_ratings.song_id = r4_song_sid.song_id 
                        AND r4_song_sid.sid = %s
                    )
                    JOIN r4_songs ON (
                        r4_song_ratings.song_id = r4_songs.song_id
                    )
                    JOIN r4_albums USING (album_id)
                    WHERE user_id = %s
                        AND song_exists = TRUE
                        AND song_fave = TRUE
                    ORDER BY album_name, song_title
"""
                    + self.get_sql_limit_string(),
                    (self.sid, self.user.id),
                ),
            )
        else:
            self.append(
                self.return_name,
                await cursor.fetch_all(
                    """
                    SELECT
                        r4_song_ratings.song_id AS id,
                        song_title AS title,
                        r4_albums.album_id,
                        album_name,
                        CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating,
                        COALESCE(song_rating_user, 0) AS rating_user,
                        song_fave AS fave
                    FROM r4_song_ratings
                        JOIN r4_songs USING (song_id)
                        JOIN r4_albums USING (album_id)
                    WHERE user_id = %s
                        AND song_verified = TRUE
                        AND song_fave = TRUE
                    ORDER BY album_name, song_title
"""
                    + self.get_sql_limit_string(),
                    (self.user.id,),
                ),
            )


@handle_api_html_url("all_faves")
class AllFavHTML(PrettyPrintAPIMixin, AllFavHandler):
    pass
