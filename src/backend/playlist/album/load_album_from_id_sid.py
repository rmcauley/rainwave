from typing import TypedDict
from backend.db.cursor import RainwaveCursor, RainwaveCursorTx
from backend.playlist.album.model.album_on_station import (
    AlbumOnStation,
)
from backend.playlist.metadata import MetadataNotFoundError


class AlbumOnStationFullRow(TypedDict):
    album_id: int
    album_name: str
    album_name_searchable: str
    album_year: int
    album_added_on: int

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


async def load_album_on_station_from_id(
    cursor: RainwaveCursor | RainwaveCursorTx, album_id: int, sid: int
) -> AlbumOnStation:
    row = await cursor.fetch_row(
        """
        SELECT 
            r4_albums.album_id,
            r4_albums.album_name,
            r4_albums.album_name_searchable,
            r4_albums.album_year,
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
        raise MetadataNotFoundError(
            "%s ID %s for sid %s could not be found."
            % ("AlbumOnStation", album_id, sid)
        )

    return AlbumOnStation(
        {
            "album_id": row["album_id"],
            "album_name": row["album_name"],
            "album_name_searchable": row["album_name_searchable"],
            "album_year": row["album_year"],
            "album_added_on": row["album_added_on"],
        },
        {
            "album_id": row["album_id"],
            "album_exists": row["album_exists"],
            "sid": row["sid"],
            "album_song_count": row["album_song_count"],
            "album_played_last": row["album_played_last"],
            "album_requests_pending": row["album_requests_pending"],
            "album_cool": row["album_cool"],
            "album_cool_multiply": row["album_cool_multiply"],
            "album_cool_override": row["album_cool_override"],
            "album_cool_lowest": row["album_cool_lowest"],
            "album_updated": row["album_updated"],
            "album_elec_last": row["album_elec_last"],
            "album_rating": row["album_rating"],
            "album_rating_count": row["album_rating_count"],
            "album_request_count": row["album_request_count"],
            "album_fave_count": row["album_fave_count"],
            "album_newest_song_time": row["album_newest_song_time"],
            "album_art_url": row["album_art_url"],
        },
    )
