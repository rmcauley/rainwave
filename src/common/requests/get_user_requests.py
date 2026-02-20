from typing import TypedDict

from common.db.cursor import RainwaveCursor


class UserRequestedSong(TypedDict):
    id: int
    sid: int
    origin_sid: int
    order: int
    request_id: int
    rating: float
    title: str
    length: int
    cool: bool
    cool_end: int | None
    good: bool
    elec_blocked: bool
    elec_blocked_by: str | None
    elec_blocked_num: int | None
    valid: bool
    rating_user: float
    album_rating_user: float
    fave: bool
    album_fave: bool
    album_id: int
    album_name: str
    album_rating: float
    album_rating_complete: bool


async def get_requests(
    cursor: RainwaveCursor, sid: int, user_id: int
) -> list[UserRequestedSong]:
    requests = await cursor.fetch_all(
        """
        SELECT
            r4_request_store.song_id AS id,
            COALESCE(r4_song_sid.sid, r4_request_store.sid) AS sid,
            r4_songs.song_origin_sid AS origin_sid,
            r4_request_store.reqstor_order AS order,
            r4_request_store.reqstor_id AS request_id,
            CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating,
            song_title AS title,
            song_length AS length,
            r4_song_sid.song_cool AS cool,
            r4_song_sid.song_cool_end AS cool_end,
            song_exists AS good,
            r4_song_sid.song_elec_blocked AS elec_blocked,
            r4_song_sid.song_elec_blocked_by AS elec_blocked_by,
            r4_song_sid.song_elec_blocked_num AS elec_blocked_num,
            r4_song_sid.song_exists AS valid,
            COALESCE(song_rating_user, 0) AS rating_user,
            COALESCE(album_rating_user, 0) AS album_rating_user,
            song_fave AS fave,
            album_fave AS album_fave,
            r4_songs.album_id AS album_id,
            r4_albums.album_name,
            r4_album_sid.album_rating AS album_rating,
            album_rating_complete
        FROM r4_request_store
            JOIN r4_songs USING (song_id)
            JOIN r4_albums USING (album_id)
            JOIN r4_album_sid ON (
                r4_albums.album_id = r4_album_sid.album_id 
                AND r4_request_store.sid = r4_album_sid.sid
            )
            LEFT JOIN r4_song_sid ON (
                r4_request_store.song_id = r4_song_sid.song_id 
                AND r4_song_sid.sid = %(sid)s
            )
            LEFT JOIN r4_song_ratings ON (
                r4_request_store.song_id = r4_song_ratings.song_id 
                AND r4_song_ratings.user_id = %(user_id)s
            )
            LEFT JOIN r4_album_ratings ON (
                r4_songs.album_id = r4_album_ratings.album_id 
                AND r4_album_ratings.user_id = %(user_id)s 
                AND r4_album_ratings.sid = %(sid)s
            )
            LEFT JOIN r4_album_faves ON (
                r4_songs.album_id = r4_album_faves.album_id 
                AND r4_album_faves.user_id = %(user_id)s
            )
        WHERE r4_request_store.user_id = %(user_id)s
        ORDER BY reqstor_order, reqstor_id
        """,
        {"user_id": user_id, "sid": sid},
        row_type=UserRequestedSong,
    )
    if not requests:
        requests = []
    for song in requests:
        if (
            not song["valid"]
            or song["cool"]
            or song["elec_blocked"]
            or song["sid"] != sid
        ):
            song["valid"] = False
        else:
            song["valid"] = True
    return requests
