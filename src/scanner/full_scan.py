from common.db.cursor import get_tx_cursor
from common.playlist.song.disable_song import disable_song
from scanner.album_art import process_unmatched_art, write_unmatched_art_log
from scanner.scan_all_directories import scan_all_directories


async def full_scan(full_reset: bool) -> None:
    async with get_tx_cursor() as cursor:
        if full_reset:
            await cursor.update("UPDATE r4_songs SET song_file_mtime = 0")

        await cursor.update("UPDATE r4_songs SET song_scanned = FALSE")

        await scan_all_directories(cursor, art_only=False)

        # This procedure is slow but steady and easy to use.
        dead_songs = await cursor.fetch_list(
            "SELECT song_id FROM r4_songs WHERE song_scanned = FALSE AND song_verified = TRUE",
            params=None,
            row_type=int,
        )
        for song_id in dead_songs:
            await disable_song(cursor, song_id)

        await process_unmatched_art(cursor)
        write_unmatched_art_log()
