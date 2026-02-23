@handle_api_url("all_songs")
class AllSongsHandler(APIHandler):
    return_name = "all_songs"
    login_required = True
    sid_required = False
    allow_get = True
    description = "Gets every song including a user's ratings.  Order field can be 'name', sorting by album and song title, or 'rating'."
    pagination = True
    fields = {"order": (fieldtypes.string, False)}

    def post(self):
        order = "album_name, song_title"
        distinct_on = "album_name, song_title"
        if self.get_argument("order") == "rating":
            order = "song_rating_user DESC, album_name, song_title"
            distinct_on = "song_rating_user, album_name, song_title"
        self.append(
            self.return_name,
            await cursor.fetch_all(
                "SELECT DISTINCT ON ("
                + distinct_on
                + ") r4_songs.song_id AS id, song_title AS title, album_name, CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating, song_rating_user AS rating_user, song_fave AS fave "
                "FROM r4_songs JOIN r4_song_sid USING (song_id) JOIN r4_albums USING (album_id) "
                "LEFT JOIN r4_song_ratings ON (r4_songs.song_id = r4_song_ratings.song_id AND user_id = %s) "
                "WHERE song_verified = TRUE ORDER BY "
                + order
                + " "
                + self.get_sql_limit_string(),
                (self.user.id,),
            ),
        )
