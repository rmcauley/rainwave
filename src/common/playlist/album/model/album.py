from typing import TypedDict

from common.db.cursor import RainwaveCursor

from common.playlist.remove_diacritics import remove_diacritics
from api.exceptions import APIException

num_albums: dict[int, int] = {}


class AlbumRow(TypedDict):
    album_id: int
    album_name: str
    album_name_searchable: str
    album_added_on: int


class Album:
    id: int
    data: AlbumRow

    def __init__(self, data: AlbumRow):
        super().__init__()
        self.id = data["album_id"]
        self.data = data

    @staticmethod
    async def upsert(cursor: RainwaveCursor, name: str) -> Album:
        data = await cursor.fetch_row(
            """
            INSERT INTO 
                r4_albums (album_name, album_name_searchable) 
                VALUES (%(name)s, %(name_searchable)s)
            ON CONFLICT DO UPDATE SET album_name = %(name)s, album_name_searchable = %(name_searchable)s
            RETURNING *""",
            ({"name": name, "name_searchable": remove_diacritics(name)}),
            row_type=AlbumRow,
        )

        if data is None:
            raise APIException("internal_error")

        return Album(data)

    async def get_num_songs_for_station(self, cursor: RainwaveCursor, sid: int) -> int:
        return await cursor.fetch_guaranteed(
            "SELECT COUNT(song_id) FROM r4_song_sid JOIN r4_songs USING (song_id) WHERE r4_songs.album_id = %s AND sid = %s AND song_exists = TRUE AND song_verified = TRUE",
            (self.id, sid),
            default=0,
            var_type=int,
        )

    async def reconcile_sids(self, cursor: RainwaveCursor) -> list[int]:
        new_sids = await cursor.fetch_list(
            "SELECT sid FROM r4_songs JOIN r4_song_sid USING (song_id) WHERE r4_songs.album_id = %s AND song_exists = TRUE AND song_verified = TRUE GROUP BY sid",
            (self.id,),
            row_type=int,
        )
        current_sids = await cursor.fetch_list(
            "SELECT sid FROM r4_album_sid WHERE album_id = %s AND album_exists = TRUE",
            (self.id,),
            row_type=int,
        )
        old_sids = await cursor.fetch_list(
            "SELECT sid FROM r4_album_sid WHERE album_id = %s AND album_exists = FALSE",
            (self.id,),
            row_type=int,
        )

        for sid in current_sids:
            if not sid in new_sids:
                await cursor.update(
                    "UPDATE r4_album_sid SET album_exists = FALSE AND album_song_count = 0 WHERE album_id = %s AND sid = %s",
                    (self.id, sid),
                )

        for sid in new_sids:
            if sid in current_sids:
                pass
            elif sid in old_sids:
                await cursor.update(
                    "UPDATE r4_album_sid SET album_exists = TRUE WHERE album_id = %s AND sid = %s",
                    (self.id, sid),
                )
            else:
                await cursor.update(
                    "INSERT INTO r4_album_sid (album_id, sid) VALUES (%s, %s)",
                    (self.id, sid),
                )
            num_songs = await self.get_num_songs_for_station(cursor, sid)
            await cursor.update(
                "UPDATE r4_album_sid SET album_song_count = %s WHERE album_id = %s AND sid = %s",
                (num_songs, self.id, sid),
            )

        return new_sids

    async def update_all_user_ratings(self, cursor: RainwaveCursor) -> None:
        await cursor.update(
            "DELETE FROM r4_album_ratings WHERE album_id = %s", (self.id,)
        )
        for sid in await cursor.fetch_list(
            "SELECT sid FROM r4_album_sid WHERE album_id = %s AND album_exists = TRUE",
            (self.id,),
            row_type=int,
        ):
            num_songs = await self.get_num_songs_for_station(cursor, sid)
            await cursor.update(
                """
                INSERT INTO r4_album_ratings (
                    sid, 
                    album_id, 
                    user_id,
                    album_rating_user, 
                    album_rating_complete
                )
                SELECT 
                    sid, 
                    album_id, 
                    user_id, 
                    NULLIF(ROUND(CAST(AVG(song_rating_user) AS NUMERIC), 1), 0) AS album_rating_user, 
                    CASE WHEN COUNT(song_rating_user) >= %s THEN TRUE ELSE FALSE END AS album_rating_complete 
                FROM
                    (SELECT 
                        song_id, 
                        sid, 
                        r4_songs.album_id 
                    FROM r4_songs 
                        JOIN r4_song_sid USING (song_id) 
                    WHERE 
                        r4_songs.album_id = %s 
                        AND r4_song_sid.sid = %s 
                        AND song_exists = TRUE 
                        AND song_verified = TRUE 
                    ) AS r4_song_sid 
                    LEFT JOIN r4_song_ratings USING (song_id) 
                WHERE r4_song_ratings.song_rating_user IS NOT NULL 
                GROUP BY album_id, sid, user_id 
                HAVING NULLIF(ROUND(CAST(AVG(song_rating_user) AS NUMERIC), 1), 0) IS NOT NULL 
                ON CONFLICT DO NOTHING
""",
                (num_songs, self.id, sid),
            )

    async def reset_user_completed_flags(self, cursor: RainwaveCursor) -> None:
        await cursor.update(
            """
            WITH status AS ( 
                SELECT 
                    CASE WHEN COUNT(song_rating) >= album_song_count THEN TRUE ELSE FALSE END AS rating_complete, 
                    r4_songs.album_id, 
                    r4_song_sid.sid, 
                    user_id 
                FROM r4_songs 
                    JOIN r4_song_sid USING (song_id) 
                    JOIN r4_song_ratings USING (song_id) 
                    JOIN r4_album_sid ON (r4_songs.album_id = r4_album_sid.album_id AND r4_song_sid.sid = r4_album_sid.sid) 
                WHERE 
                    r4_songs.album_id = %s 
                    AND r4_song_sid.song_rating_user IS NOT NULL 
                GROUP BY r4_songs.album_id, album_song_count, r4_song_sid.sid, user_id  
            ) 
            UPDATE r4_album_ratings 
            SET album_rating_complete = status.rating_complete 
            FROM status 
            WHERE 
                r4_album_ratings.album_id = status.album_id 
                AND r4_album_ratings.sid = status.sid 
                AND r4_album_ratings.user_id = status.user_id
            """,
            (self.id,),
        )
