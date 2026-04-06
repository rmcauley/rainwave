import os

from common import log
from common.db.cursor import RainwaveCursor
from common.playlist.song.model.song_file import SongFile
from scanner.album_art import process_album_art
from scanner.disable_file import disable_file
from scanner.is_image import is_image
from scanner.is_mp3 import is_mp3
from scanner.scan_errors import add_scan_error


async def scan_file(cursor: RainwaveCursor, filename: str, sids: list[int]) -> None:
    if is_image(filename):
        await process_album_art(cursor, filename, sids[0], True)
        return

    if not is_mp3(filename):
        return

    new_mtime = None
    try:
        new_mtime = os.stat(filename)[8]
    except IOError as e:
        await add_scan_error(filename, e)
        await disable_file(cursor, filename)
    try:
        log.debug("scan", "sids: {} Scanning file: {}".format(sids, filename))
        # Only scan the file if we don't have a previous mtime for it, or the mtime is different
        old_mtime = await cursor.fetch_var(
            "SELECT song_file_mtime FROM r4_songs WHERE song_filename = %s AND song_verified = TRUE",
            (filename,),
            var_type=int,
        )
        if old_mtime != new_mtime or not old_mtime:
            log.debug(
                "scan", f"mtime mismatch {old_mtime} {new_mtime}, scanning for changes"
            )
            song_file = await SongFile.create(cursor, filename)
            await song_file.upsert(cursor, sids, sids[0])
        else:
            log.debug("scan", "mtime match, no action taken.")
            await cursor.update(
                "UPDATE r4_songs SET song_scanned = TRUE WHERE song_filename = %s",
                (filename,),
            )
    except IOError as e:
        await add_scan_error(filename, e)
        await disable_file(cursor, filename)
    except Exception as e:
        await add_scan_error(filename, e)
        await disable_file(cursor, filename)
