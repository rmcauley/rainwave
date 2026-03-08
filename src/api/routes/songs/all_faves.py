from api.handler_classes.api_handler_with_get import APIHandlerWithGet
from api import rainwave_typeddicts
from api.handle_url import handle_api_html_url, handle_api_url
from api.helpers.paginated_requests import get_pagination_sql_limit_string
from common.db.cursor import get_cursor
from psycopg import sql


@handle_api_url("all_faves")
class AllFavHandler(APIHandlerWithGet):
    description = "Get all songs that have been faved by the user."
    return_name = "all_faves"
    login_required = True
    sid_required = False
    pagination = True

    async def post(self):
        async with get_cursor() as cursor:
            if "sid" in self.request.arguments:
                self.response["all_faves"] = await cursor.fetch_all(
                    sql.SQL(
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
                    ) + get_pagination_sql_limit_string(self),
                    (self.sid, self.user.id),
                    row_type=rainwave_typeddicts.AllFave,
                )
            else:
                self.response["all_faves"] = await cursor.fetch_all(
                    sql.SQL(
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
                    ) + get_pagination_sql_limit_string(self),
                    (self.user.id,),
                    row_type=rainwave_typeddicts.AllFave,
                )
        self.write_rainwave_output()


@handle_api_html_url("all_faves")
class AllFavHTML(AllFavHandler):
    pretty_print_html = True
