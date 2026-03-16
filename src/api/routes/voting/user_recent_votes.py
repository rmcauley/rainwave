from api import rainwave_typeddicts
from psycopg import sql

from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from api.handle_url import handle_api_url, handle_api_html_url
from api.helpers.paginated_requests import get_pagination_sql_limit_string
from common.db.cursor import get_cursor


@handle_api_url("user_recent_votes")
class RecentlyVotedSongs(RegisteredUserAPIHandler):
    description = "Shows the user's recently voted on songs."
    return_name = "user_recent_votes"
    login_required = True
    sid_required = True
    pagination = True

    async def post(self):
        async with get_cursor() as cursor:
            self.response["user_recent_votes"] = await cursor.fetch_all(
                sql.SQL(
                    """
                    SELECT
                        r4_songs.song_id AS id,
                        song_title AS title,
                        album_name,
                        CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating,
                        song_rating_user AS rating_user,
                        song_fave AS fave
                    FROM r4_vote_history
                        JOIN r4_song_sid USING (song_id, sid)
                        JOIN r4_songs USING (song_id)
                        JOIN r4_albums USING (album_id)
                        LEFT JOIN r4_song_ratings ON (
                            r4_songs.song_id = r4_song_ratings.song_id 
                            AND r4_song_ratings.user_id = r4_vote_history.user_id
                        )
                    WHERE r4_vote_history.sid = %s
                        AND r4_vote_history.user_id = %s
                        AND song_verified = TRUE
                    ORDER BY vote_id DESC
                    """
                )
                + get_pagination_sql_limit_string(self),
                (self.sid, self.user.id),
                row_type=rainwave_typeddicts.UserRecentVote,
            )


@handle_api_html_url("user_recent_votes")
class RecentlyVotedSongsHTML(RecentlyVotedSongs):
    pretty_print_html = True
