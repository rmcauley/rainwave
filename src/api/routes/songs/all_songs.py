from api import fieldtypes
from api import rainwave_typeddicts
from api.handler_classes.api_handler_with_get import APIHandlerWithGet
from api.handle_url import handle_api_url
from api.helpers.paginated_requests import get_pagination_sql_limit_string
from common.db.cursor import get_cursor
from psycopg import sql


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
                    self.response["all_songs"] = await cursor.fetch_all(
                    sql.SQL(
                        """
                        SELECT DISTINCT ON ({distinct_on})
                            r4_songs.song_id AS id,
                            song_title AS title,
                            album_name,
                            CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating,
                            song_rating_user AS rating_user,
                            song_fave AS fave
                        FROM r4_songs
                        JOIN r4_song_sid USING (song_id)
                        JOIN r4_albums USING (album_id)
                        LEFT JOIN r4_song_ratings ON (
                            r4_songs.song_id = r4_song_ratings.song_id AND user_id = %s
                        )
                        WHERE song_verified = TRUE
                        ORDER BY {order}
                        """
                    ).format(
                        distinct_on=sql.SQL(distinct_on),
                        order=sql.SQL(order),
                    )
                    + get_pagination_sql_limit_string(self),
                    (self.user.id,),
                    row_type=rainwave_typeddicts.AllSong,
                ),
