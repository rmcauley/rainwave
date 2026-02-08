from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.playlist.album.model.album import Album, AlbumRow


async def get_album_for_song(
    cursor: RainwaveCursor | RainwaveCursorTx, song_id: int
) -> Album | None:
    album_row = await cursor.fetch_row(
        "SELECT r4_albums.* FROM r4_songs JOIN r4_albums USING (album_id) WHERE song_id = %s",
        (song_id,),
        row_type=AlbumRow,
    )
    if album_row:
        return Album(album_row)
    return None
