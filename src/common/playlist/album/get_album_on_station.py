from typing import TypedDict
from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.playlist.album.model.album_on_station import (
    AlbumOnStation,
)


class AlbumNotFoundError(Exception):
    pass


class AlbumOnStationFullRow(TypedDict):
    # from albums table
    album_id: int
    album_name: str
    album_name_searchable: str
    album_added_on: int
    # from album_sid table
    album_exists: bool
    sid: int
    album_song_count: int
    album_played_last: int
    album_requests_pending: bool
    album_cool: bool
    album_cool_multiply: float
    album_cool_override: int
    album_cool_lowest: int
    album_updated: int
    album_elec_last: int
    album_rating: float
    album_rating_count: int
    album_request_count: int
    album_fave_count: int
    album_newest_song_time: int | None
    album_art_url: str | None


async def get_album_on_station(
    cursor: RainwaveCursor | RainwaveCursorTx, album_id: int, sid: int
) -> AlbumOnStation:
    row = await cursor.fetch_row(
        """
        SELECT 
            r4_albums.album_id,
            r4_albums.album_name,
            r4_albums.album_name_searchable,
            r4_albums.album_added_on,
            r4_album_sid.album_exists,
            r4_album_sid.sid,
            r4_album_sid.album_song_count,
            r4_album_sid.album_played_last,
            r4_album_sid.album_requests_pending,
            r4_album_sid.album_cool,
            r4_album_sid.album_cool_multiply,
            r4_album_sid.album_cool_override,
            r4_album_sid.album_cool_lowest,
            r4_album_sid.album_updated,
            r4_album_sid.album_elec_last,
            r4_album_sid.album_rating,
            r4_album_sid.album_rating_count,
            r4_album_sid.album_request_count,
            r4_album_sid.album_fave_count,
            r4_album_sid.album_newest_song_time,
            r4_album_sid.album_art_url
        FROM r4_album_sid 
            JOIN r4_albums USING (album_id) 
        WHERE r4_album_sid.album_id = %s AND r4_album_sid.sid = %s
        """,
        (album_id, sid),
        row_type=AlbumOnStationFullRow,
    )
    if not row:
        raise AlbumNotFoundError(
            "%s ID %s for sid %s could not be found."
            % ("AlbumOnStation", album_id, sid)
        )

    return AlbumOnStation(row)
