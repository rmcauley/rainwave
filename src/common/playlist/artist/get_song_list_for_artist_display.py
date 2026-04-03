from psycopg import sql
from typing import Literal, TypedDict, cast
from api import rainwave_typeddicts
from common import stations
from common.db.cursor import RainwaveCursor


class SongListForArtistDisplayRow(TypedDict):
    id: int
    sid: int
    title: str
    rating: float
    requestable: bool
    length: int
    cool: bool
    cool_end: int
    url: str | None
    link_text: str | None
    rating_user: float | None
    fave: bool
    album_name: str
    album_id: int


class SongForArtistAlbum(TypedDict):
    name: str
    id: int


class SongForArtist(TypedDict):
    id: int
    sid: int
    title: str
    rating: float
    requestable: bool
    length: int
    cool: bool
    cool_end: int
    url: str | None
    link_text: str | None
    rating_user: float | None
    fave: bool
    album: SongForArtistAlbum


def get_select_sql_for_songs_for_artist_or_group_display() -> sql.SQL:
    return sql.SQL("""
        SELECT 
            r4_songs.song_id AS id, 
            r4_songs.song_origin_sid AS sid, 
            song_title AS title, 
            CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating, 
            song_exists AS requestable, 
            song_length AS length, 
            song_cool AS cool, 
            song_cool_end AS cool_end, 
            song_url as url, 
            song_link_text as link_text, 
            COALESCE(song_rating_user, 0) AS rating_user, 
            COALESCE(song_fave, FALSE) AS fave, 
            album_name, 
            r4_albums.album_id 
        """)


async def get_song_list_by_album_for_artist_display(
    cursor: RainwaveCursor, artist_id: int, sid: int, user_id: int
) -> rainwave_typeddicts.AllSongsForArtist:
    query = get_select_sql_for_songs_for_artist_or_group_display() + sql.SQL("""
        FROM r4_song_artist 
            JOIN r4_songs USING (song_id) 
            JOIN r4_albums USING (album_id) 
            LEFT JOIN r4_album_sid ON (r4_albums.album_id = r4_album_sid.album_id AND r4_album_sid.sid = %s) 
            LEFT JOIN r4_song_sid ON (r4_songs.song_id = r4_song_sid.song_id AND r4_song_sid.sid = %s) 
            LEFT JOIN r4_song_ratings ON (r4_song_artist.song_id = r4_song_ratings.song_id AND r4_song_ratings.user_id = %s) 
        WHERE r4_song_artist.artist_id = %s AND r4_songs.song_verified = TRUE 
        ORDER BY song_exists DESC, album_name, song_title
        """)
    query_params = (sid, sid, user_id, artist_id)

    to_return: rainwave_typeddicts.AllSongsForArtist = {}
    requestable = True if user_id > 1 else False
    async for song in cursor.for_each_row(
        query, query_params, row_type=SongListForArtistDisplayRow
    ):
        if not song["sid"] in stations.station_ids:
            continue
        song["requestable"] = requestable and song["requestable"]
        sid_index = cast(Literal["1", "2", "3", "4", "5", "6"], str(song["sid"]))
        if not to_return.get(sid_index, None):
            to_return[sid_index] = {}
        sid_dict = to_return.get(sid_index, {})
        album_id_index = str(song["album_id"])
        if not album_id_index in sid_dict:
            sid_dict[album_id_index] = []
        sid_dict[album_id_index].append(
            {
                "albums": [{"id": song["album_id"], "name": song["album_name"]}],
                "id": song["id"],
                "sid": song["sid"],
                "title": song["title"],
                "rating": song["rating"],
                "requestable": song["requestable"],
                "length": song["length"],
                "cool": song["cool"],
                "url": song["url"],
                "link_text": song["link_text"],
                "rating_user": song["rating_user"],
                "fave": song["fave"],
            }
        )

    return to_return
