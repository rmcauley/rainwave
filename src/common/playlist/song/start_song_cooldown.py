from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.playlist.album.get_album_on_station import get_album_on_station
from common.playlist.song.model.song_on_station import SongOnStation


async def start_song_cooldown(
    cursor: RainwaveCursor | RainwaveCursorTx, song_on_station: SongOnStation
) -> None:
    album_on_station = await get_album_on_station(
        cursor, song_on_station.data["album_id"], song_on_station.sid
    )
    await album_on_station.update_last_played(cursor)
    await album_on_station.update_rating(cursor)
    await album_on_station.start_cooldown(cursor)

    await song_on_station.update_last_played(cursor)
    await song_on_station.update_rating(cursor)
    await song_on_station.start_cooldown(cursor)
