from common import log
from common.db.cursor import RainwaveCursor
from common.playlist.song.disable_song import disable_song
from scanner.scan_errors import add_scan_error


async def disable_file(cursor: RainwaveCursor, filename: str) -> None:
    log.debug("scan", "Attempting to disable file: {}".format(filename))
    try:
        song_id = await cursor.fetch_var(
            "SELECT song_id FROM r4_songs WHERE song_filename = %s",
            (filename,),
            var_type=int,
        )
        if song_id:
            log.debug("scan", "Found song to disable.")
            await disable_song(cursor, song_id)
            log.debug("scan", "Song disabled: {}".format(filename))
        else:
            log.debug("scan", "Found no song by that filename.")
    except Exception as e:
        await add_scan_error(filename, e)
