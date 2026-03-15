from typing import TypedDict, cast

import orjson

from api import rainwave_typeddicts
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
    album_art_url: str | None
    artist_parseable: str
    song_link_text: str | None
    song_url: str | None


async def get_user_requests(
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
            album_rating_complete,
            album_art_url,
            artist_parseable,
            song_link_text,
            song_url
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


def user_requests_to_api(
    requests: list[UserRequestedSong],
) -> list[rainwave_typeddicts.Request]:
    requests_api: list[rainwave_typeddicts.Request] = []
    for song_request in requests:
        album: rainwave_typeddicts.RequestAlbum = {
            "art": song_request["album_art_url"],
            "id": song_request["album_id"],
            "name": song_request["album_name"],
            "rating": song_request["rating"],
            "rating_complete": song_request["album_rating_complete"],
            "rating_user": song_request["rating_user"],
        }
        song_request_api: rainwave_typeddicts.Request = {
            "albums": [album],
            "artists": [
                {"id": artist["name"], "name": artist["name"]}
                for artist in orjson.loads(song_request["artist_parseable"])
            ],
            "cool": song_request["cool"],
            "cool_end": song_request["cool_end"],
            "elec_blocked": song_request["elec_blocked"],
            "elec_blocked_by": cast(
                rainwave_typeddicts.ElecBlockedBy, song_request["elec_blocked_by"]
            ),
            "elec_blocked_num": song_request["elec_blocked_num"],
            "fave": song_request["fave"],
            "good": song_request["good"],
            "id": song_request["id"],
            "length": song_request["length"],
            "link_text": song_request["song_link_text"],
            "order": song_request["order"],
            "origin_sid": song_request["origin_sid"],
            "rating": song_request["rating"],
            "rating_user": song_request["rating_user"],
            "request_id": song_request["request_id"],
            "sid": song_request["sid"],
            "title": song_request["title"],
            "url": song_request["song_url"],
            "valid": song_request["valid"],
        }
        requests_api.append(song_request_api)
    return requests_api
