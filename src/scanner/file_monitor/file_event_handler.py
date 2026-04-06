import os

from watchfiles import Change

from common import config, log
from common.db.cursor import get_cursor
from scanner.album_art import process_unmatched_art
from scanner.disable_file import disable_file
from scanner.is_mp3 import is_mp3
from scanner.scan_directory import scan_directory
from scanner.scan_errors import add_scan_error
from scanner.scan_file import scan_file
from scanner.should_ignore_file import should_ignore_file


async def process_change(
    change: Change, path: str, known_directories: set[str]
) -> None:
    normalized_path = os.path.normpath(path)
    is_directory = os.path.isdir(normalized_path)
    is_known_deleted_directory = normalized_path in known_directories

    if is_directory:
        remember_directory_tree(normalized_path, known_directories)
    elif is_known_deleted_directory:
        forget_directory_tree(normalized_path, known_directories)
    elif change == Change.deleted and not is_mp3(normalized_path):
        log.debug("scan", "Ignoring delete event for non-MP3 %s" % normalized_path)
        return

    await process_path(
        change,
        normalized_path,
        is_directory=is_directory or is_known_deleted_directory,
    )


async def process_path(change: Change, path: str, *, is_directory: bool) -> None:
    if not is_directory and should_ignore_file(path):
        return

    async with get_cursor() as cursor:
        matched_sids: list[int] = []
        try:
            for song_dirs_path, sids in config.song_dirs.items():
                if path.startswith(song_dirs_path):
                    matched_sids.extend(sids)
        except Exception as xception:
            await add_scan_error(path, xception)

        log.debug("scan", "%s %s %s" % (change.name.upper(), path, matched_sids))

        try:
            if is_directory:
                await scan_directory(cursor, path, matched_sids)
            elif not matched_sids or change == Change.deleted:
                await disable_file(cursor, path)
            else:
                await scan_file(cursor, path, matched_sids)
        except Exception as xception:
            await add_scan_error(path, xception)

        await process_unmatched_art(cursor)


def remember_directory_tree(directory: str, known_directories: set[str]) -> None:
    for root, _subdirs, _files in os.walk(directory, followlinks=True):
        known_directories.add(os.path.normpath(root))


def forget_directory_tree(directory: str, known_directories: set[str]) -> None:
    normalized_directory = os.path.normpath(directory)
    prefix = normalized_directory + os.sep
    for known_directory in tuple(known_directories):
        if known_directory == normalized_directory or known_directory.startswith(
            prefix
        ):
            known_directories.discard(known_directory)
