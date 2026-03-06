from api.handler_classes.api_handler_with_get import APIHandlerWithGet
from common.db.cursor import get_cursor


@handle_api_url("all_songs")
class AllSongsHandler(APIHandlerWithGet):
    return_name = "all_songs"
    login_required = True
    sid_required = False
    description = "Gets every song including a user's ratings.  Order field can be 'name', sorting by album and song title, or 'rating'."
    pagination = True
    fields = {"order": (fieldtypes.string, False)}

    async def post(self):
        async with get_cursor() as cursor:
            order = "album_name, song_title"
            distinct_on = "album_name, song_title"
            if input. == "rating":
                order = "song_rating_user DESC, album_name, song_title"
                distinct_on = "song_rating_user, album_name, song_title"
                    self.response[self.return_name] = await cursor.fetch_all(
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
