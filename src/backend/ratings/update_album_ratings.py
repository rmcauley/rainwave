from typing import TypedDict

from backend.db.cursor import RainwaveCursor, RainwaveCursorTx


class UpdatedAlbumRating(TypedDict):
    sid: int
    id: int
    rating_user: float | None
    rating_complete: bool


class GetAssociatedAlbumRow(TypedDict):
    album_id: int
    sid: int
    album_song_count: int


class GetUpdatedAlbumRatingRow(TypedDict):
    rating_user: float
    rating_user_count: int


async def update_album_ratings(
    cursor: RainwaveCursor | RainwaveCursorTx,
    target_sid: int,
    song_id: int,
    user_id: int,
) -> list[UpdatedAlbumRating]:
    toret: list[UpdatedAlbumRating] = []
    for row in await cursor.fetch_all(
        "SELECT r4_songs.album_id, sid, album_song_count FROM r4_songs JOIN r4_album_sid USING (album_id) WHERE r4_songs.song_id = %s AND album_exists = TRUE",
        (song_id,),
        row_type=GetAssociatedAlbumRow,
    ):
        album_id = row["album_id"]
        sid = row["sid"]
        num_songs = row["album_song_count"]
        user_data = await cursor.fetch_row(
            "SELECT ROUND(CAST(AVG(song_rating_user) AS NUMERIC), 1) AS rating_user, "
            "COUNT(song_rating_user) AS rating_user_count "
            "FROM r4_songs "
            "JOIN r4_song_sid USING (song_id) "
            "JOIN r4_song_ratings USING (song_id) "
            "WHERE album_id = %s AND sid = %s AND song_exists = TRUE AND user_id = %s",
            (album_id, sid, user_id),
            row_type=GetUpdatedAlbumRatingRow,
        )
        rating_complete = False
        if user_data and user_data["rating_user_count"] >= num_songs:
            rating_complete = True
        album_rating = None
        if user_data and user_data["rating_user"]:
            album_rating = float(user_data["rating_user"])

        await cursor.update(
            """
            INSERT INTO r4_album_ratings 
                (album_rating_user, album_rating_complete, user_id, album_id, sid) 
            VALUES (%(album_rating)s, %(rating_complete)s, %(user_id)s, %(album_id)s, %(sid)s)
            ON CONFLICT DO UPDATE SET album_rating_user = %(album_rating)s, album_rating_complete = %(rating_complete)s
""",
            {
                "album_rating": album_rating,
                "rating_complete": rating_complete,
                "user_id": user_id,
                "album_id": album_id,
                "sid": sid,
            },
        )

        if target_sid == sid:
            toret.append(
                {
                    "sid": sid,
                    "id": album_id,
                    "rating_user": album_rating,
                    "rating_complete": rating_complete,
                }
            )
    return toret
