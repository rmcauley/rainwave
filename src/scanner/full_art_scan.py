from common.db.cursor import get_cursor
from scanner.album_art import process_unmatched_art, write_unmatched_art_log
from scanner.scan_all_directories import scan_all_directories


async def full_art_update() -> None:
    async with get_cursor() as cursor:
        await scan_all_directories(cursor, art_only=True)
        await process_unmatched_art(cursor)
        write_unmatched_art_log()
