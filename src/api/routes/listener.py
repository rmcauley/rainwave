import math
from typing import Literal, TypedDict, cast

from api import rainwave_typeddicts
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.rainwave_dto import Api4ListenerPostRequest
from common.db.cursor import get_cursor
from common.playlist import object_counts
from common.user.solve_avatar import solve_avatar


class UserListenerApiRow(TypedDict):
    user_id: int
    name: str
    avatar: str | None
    avatar_type: str
    colour: str | None
    rank: str | None
    regdate: int


@handle_api_url("listener")
class ListenerDetailRequest(APIHandler):
    description = "Gets detailed information, such as favourite albums and rating histogram, on a particular user."
    sid_required = False
    login_required = False

    async def post(self):
        input = self.get_validated_input(Api4ListenerPostRequest)

        async with get_cursor() as cursor:
            user = await cursor.fetch_row(
                """
                    SELECT
                        user_id,
                        COALESCE(radio_username, username) AS name,
                        user_avatar AS avatar,
                        user_avatar_type AS avatar_type,
                        user_colour AS colour,
                        rank_title AS rank,
                        user_regdate AS regdate
                    FROM phpbb_users
                        LEFT JOIN phpbb_ranks ON (
                            user_rank = rank_id
                        )
                    WHERE user_id = %s
                """,
                (input.id,),
                row_type=UserListenerApiRow,
            )

            if not user:
                raise APIException("404", None, 404)

            top_albums = await cursor.fetch_all(
                """
                SELECT
                    album_id AS id,
                    album_name AS name,
                    CAST(ROUND(CAST(album_rating_user AS NUMERIC), 1) AS REAL) AS rating_listener,
                    CAST(ROUND(CAST(album_rating AS NUMERIC), 1) AS REAL) AS rating
                FROM r4_album_ratings
                    JOIN r4_album_sid USING (album_id, sid)
                    JOIN r4_albums USING (album_id)
                WHERE user_id = %s
                    AND r4_album_ratings.sid = %s
                    AND album_exists = TRUE
                    AND r4_album_sid.album_song_count >= 4
                    AND r4_album_ratings.album_rating_user > 0
                ORDER BY 
                    album_rating_user DESC NULLS LAST,
                    r4_album_sid.album_song_count DESC
                LIMIT 10
                """,
                (input.id, self.sid),
                row_type=rainwave_typeddicts.ListenerTopAlbum,
            )

            top_request_albums: list[rainwave_typeddicts.ListenerTopRequestAlbum] = []
            if self.sid == 5:
                top_request_albums = await cursor.fetch_all(
                    """
                    SELECT
                        COUNT(request_id) AS request_count_listener,
                        id,
                        name
                    FROM (
                        SELECT 
                            r4_songs.album_id AS id, 
                            album_name AS name, 
                            request_id 
                        FROM r4_request_history
                        JOIN r4_songs USING (song_id)
                        JOIN r4_albums USING (album_id) 
                        WHERE r4_request_history.user_id = %s 
                        ORDER BY request_id DESC LIMIT 1000
                    ) AS reqs
                    GROUP BY id, name
                    ORDER BY request_count_listener DESC
                    LIMIT 10
                    """,
                    (input.id,),
                    row_type=rainwave_typeddicts.ListenerTopRequestAlbum,
                )
            else:
                top_request_albums = await cursor.fetch_all(
                    """
                    SELECT
                        COUNT(request_id) AS request_count_listener,
                        id,
                        name
                    FROM (
                        SELECT 
                            r4_songs.album_id AS id, 
                            album_name AS name, 
                            request_id 
                        FROM r4_request_history
                        JOIN r4_songs USING (song_id)
                        JOIN r4_album_sid ON (
                            r4_album_sid.sid = %s 
                            AND r4_album_sid.album_exists = TRUE 
                            AND r4_songs.album_id = r4_album_sid.album_id
                        )
                        JOIN r4_albums ON (
                            r4_album_sid.album_id = r4_albums.album_id
                        ) 
                        WHERE 
                            r4_request_history.user_id = %s 
                            AND r4_request_history.sid = %s 
                        ORDER BY request_id DESC LIMIT 1000
                    ) AS reqs
                    GROUP BY id,
                        name
                    ORDER BY request_count_listener DESC
                    LIMIT 10
                    """,
                    (self.sid, input.id, self.sid),
                    row_type=rainwave_typeddicts.ListenerTopRequestAlbum,
                )

            votes_by_station = await cursor.fetch_all(
                """
                SELECT
                    sid,
                    COUNT(vote_id) AS votes
                FROM r4_vote_history
                WHERE user_id = %s
                GROUP BY sid
                """,
                (input.id,),
                row_type=rainwave_typeddicts.ListenerVotesByStation,
            )

            requests_by_station = await cursor.fetch_all(
                """
                SELECT
                    sid,
                    COUNT(request_id) AS requests
                FROM r4_request_history
                WHERE user_id = %s
                    AND sid IS NOT NULL
                GROUP BY sid
                """,
                (input.id,),
                row_type=rainwave_typeddicts.ListenerRequestsByStation,
            )

            requests_by_source_station = await cursor.fetch_all(
                """
                SELECT
                    song_origin_sid AS sid,
                    COUNT(request_id) AS requests
                FROM r4_request_history
                JOIN r4_songs USING (song_id)
                WHERE user_id = %s
                    AND song_verified = TRUE
                GROUP BY song_origin_sid
                """,
                (input.id,),
                row_type=rainwave_typeddicts.ListenerRequestsByStation,
            )

            ratings_by_station = await cursor.fetch_all(
                """
                SELECT
                    song_origin_sid AS sid,
                    TO_CHAR(AVG(song_rating_user), 'FM9.99') AS average_rating,
                    COUNT(song_rating_user) AS ratings
                FROM r4_song_ratings
                JOIN r4_songs USING (song_id)
                WHERE user_id = %s
                    AND song_verified = TRUE
                    AND song_origin_sid > 0
                    AND song_rating_user IS NOT NULL
                GROUP BY song_origin_sid
                """,
                (input.id,),
                row_type=rainwave_typeddicts.ListenerRatingsByStation,
            )

            rating_completion: rainwave_typeddicts.RatingsCompletion = {}
            for row in ratings_by_station:
                rating_completion[
                    cast(
                        Literal[
                            "1",
                            "2",
                            "3",
                            "4",
                            "6",
                        ],
                        str(row["sid"]),
                    )
                ] = math.floor(
                    float(row["ratings"])
                    / float(object_counts.num_origin_songs[row["sid"]])
                    * 100
                )

            rating_spread = await cursor.fetch_all(
                "SELECT COUNT(song_id) AS ratings, song_rating_user AS rating FROM r4_song_ratings JOIN r4_songs USING (song_id) WHERE user_id = %s AND song_rating_user IS NOT NULL AND song_verified IS TRUE GROUP BY song_rating_user ORDER BY song_rating_user",
                (input.id,),
                row_type=rainwave_typeddicts.ListenerRatingSpreadItem,
            )

            self.response["listener"] = {
                "avatar": solve_avatar(user["avatar_type"], user["avatar"]),
                "colour": user["colour"],
                "losing_votes": 0,
                "mind_changes": 0,
                "name": user["name"],
                "rank": user["rank"],
                "rating_spread": rating_spread,
                "ratings_by_station": ratings_by_station,
                "ratings_completion": rating_completion,
                "regdate": user["regdate"],
                "requests_by_source_station": requests_by_source_station,
                "requests_by_station": requests_by_station,
                "top_albums": top_albums,
                "top_request_albums": top_request_albums,
                "total_ratings": 0,
                "total_requests": 0,
                "total_votes": 0,
                "user_id": user["user_id"],
                "votes_by_station": votes_by_station,
                "winning_votes": 0,
            }
