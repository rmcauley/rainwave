import math

from api import rainwave_dto
from api import rainwave_typeddicts
from psycopg import sql
from api.helpers.paginated_requests import DEFAULT_COLLECTION_PAGE_LIMIT
from api.handle_url import handle_api_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.handler_classes.api_handler import APIHandler

from common.db.cursor import get_cursor
from common.playlist import object_counts


def get_all_albums_list_sql(user_id: int | None) -> sql.Composed:
    if user_id is None or user_id == 1:
        return sql.SQL("""
            SELECT 
                r4_albums.album_id AS id, 
                album_name AS name, 
                CAST(ROUND(CAST(album_rating AS NUMERIC), 1) AS REAL) AS rating, 
                album_cool AS cool, 
                album_cool_lowest AS cool_lowest, 
                FALSE AS fave, 
                0 AS rating_user, 
                FALSE AS rating_complete, 
                album_newest_song_time AS newest_song_time 
            FROM r4_albums 
                JOIN r4_album_sid USING (album_id) 
            WHERE 
                r4_album_sid.sid = {sid}
                AND r4_album_sid.album_exists = TRUE 
            """).format(sid=sql.Placeholder(name="sid"))
    else:
        return sql.SQL("""
            SELECT 
                r4_albums.album_id AS id, 
                album_name AS name, 
                CAST(ROUND(CAST(album_rating AS NUMERIC), 1) AS REAL) AS rating, 
                album_cool AS cool, 
                album_cool_lowest AS cool_lowest, 
                COALESCE(album_fave, FALSE) AS fave, 
                COALESCE(album_rating_user, 0) AS rating_user, 
                COALESCE(album_rating_complete, FALSE) AS rating_complete, 
                album_newest_song_time AS newest_song_time 
            FROM r4_albums 
                JOIN r4_album_sid USING (album_id) 
                LEFT JOIN r4_album_ratings ON (
                    r4_album_sid.album_id = r4_album_ratings.album_id 
                    AND r4_album_ratings.user_id = {user_id} 
                    AND r4_album_ratings.sid = {sid}
                ) 
                LEFT JOIN r4_album_faves ON (
                    r4_album_sid.album_id = r4_album_faves.album_id 
                    AND r4_album_faves.user_id = {user_id}
                ) 
            WHERE 
                r4_album_sid.sid = {sid} 
                AND r4_album_sid.album_exists = TRUE 
            """).format(
            user_id=sql.Placeholder(name="user_id"), sid=sql.Placeholder(name="sid")
        )


@handle_api_url("all_albums_paginated")
class AllAlbumsPaginatedHandler(APIHandler):
    description = "Returns chunks of a list of all albums on the station playlist."

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "all_albums_paginated"

    async def post(self):
        input = self.get_validated_input(rainwave_dto.Api4AllAlbumsPaginatedPostRequest)
        async with get_cursor() as cursor:
            user_id = self.optional_user.id if self.optional_user else 1
            base_sql = get_all_albums_list_sql(user_id)
            albums_with_sentinel = await cursor.fetch_all(
                sql.SQL(
                    "{query} AND r4_albums.album_id > {after} ORDER BY id LIMIT {page_limit}"
                ).format(
                    query=base_sql,
                    after=sql.Placeholder(name="after"),
                    page_limit=sql.Literal(DEFAULT_COLLECTION_PAGE_LIMIT + 1),
                ),
                {"sid": self.sid, "user_id": user_id, "after": input.after or 0},
                row_type=rainwave_typeddicts.AlbumInList,
            )
            has_more = len(albums_with_sentinel) > DEFAULT_COLLECTION_PAGE_LIMIT
            albums = albums_with_sentinel[:DEFAULT_COLLECTION_PAGE_LIMIT]
            next_cursor = albums[-1]["id"] if albums else input.after or 0
            total_albums = object_counts.num_albums[self.sid]
            self.response["all_albums_paginated"] = {
                "data": albums,
                "has_more": has_more,
                "progress": min(
                    math.ceil(next_cursor / total_albums * 100) if total_albums > 0 else 100,
                    100,
                ),
                "next": next_cursor,
            }
