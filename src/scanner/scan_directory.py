import os

from common import log
from common.db.cursor import RainwaveCursor
from common.playlist.song.disable_song import disable_song
from scanner.scan_file import scan_file


async def scan_directory(
    cursor: RainwaveCursor, directory: str, sids: list[int]
) -> None:
    # Normalize and add a trailing separator to the directory name
    directory = os.path.join(os.path.normpath(directory), "")

    # The || %% is SQL concatenation to add a literal % at the end of the directory
    song_ids = await cursor.fetch_list(
        "SELECT song_id FROM r4_songs WHERE song_filename LIKE %s || '%%' AND song_verified = TRUE",
        (directory,),
        row_type=int,
    )
    for song_id in song_ids:
        await cursor.update(
            "UPDATE r4_songs SET song_scanned = FALSE WHERE song_id = %s", (song_id,)
        )

    do_scan = False
    try:
        os.stat(directory)
        do_scan = True
    except (IOError, OSError):
        log.debug("scan", "Directory %s no longer exists." % directory)

    if do_scan and len(sids) > 0:
        for root, _subdirs, files in os.walk(directory, followlinks=True):
            for filename in files:
                filename = os.path.join(root, filename)
                await scan_file(cursor, filename, sids)

    song_ids = await cursor.fetch_list(
        "SELECT song_id FROM r4_songs WHERE song_filename LIKE %s || '%%' AND song_scanned = FALSE AND song_verified = TRUE",
        (directory,),
        row_type=int,
    )
    for song_id in song_ids:
        await disable_song(cursor, song_id)
