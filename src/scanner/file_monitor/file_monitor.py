import os

from watchfiles import awatch  # pyright: ignore[reportUnknownVariableType]

from common import config, log
from scanner.file_monitor.file_event_handler import process_change


async def file_monitor() -> None:
    log.info("scan", "File monitor started.")
    known_directories = _load_known_directories(config.monitor_dir)

    try:
        async for changes in awatch(config.monitor_dir, recursive=True):
            for change, path in changes:
                await process_change(change, path, known_directories)
    finally:
        log.info("scan", "File monitor shutdown.")


def _load_known_directories(root: str) -> set[str]:
    known_directories: set[str] = set()
    normalized_root = os.path.normpath(root)
    if os.path.isdir(normalized_root):
        known_directories.add(normalized_root)
        for current_root, _subdirs, _files in os.walk(
            normalized_root, followlinks=True
        ):
            known_directories.add(os.path.normpath(current_root))
    return known_directories
