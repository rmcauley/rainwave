from backend.db.cursor import RainwaveCursor, RainwaveCursorTx
from backend.playlist.album.model.album_on_station import AlbumOnStation


async def load_album_on_station_from_id(cursor: RainwaveCursor | RainwaveCursorTx, album_id: int, sid: int) -> AlbumOnStation:
    row = await cursor.fetch_row(
        "SELECT r4_albums.*, r4_album_sid.* FROM r4_album_sid JOIN r4_albums USING (album_id) WHERE r4_album_sid.album_id = %s AND r4_album_sid.sid = %s",
        (album_id, sid),
        row_type=
    )
    if not row:
        raise MetadataNotFoundError(
            "%s ID %s for sid %s could not be found."
            % (cls.__name__, album_id, sid)
        )
    instance = cls()
    instance._assign_from_dict(row, sid)
    instance.sid = sid
    return instance
