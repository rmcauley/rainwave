import os

from common import config
from common.db.cursor import RainwaveCursor
from scanner.is_image import is_image
from scanner.scan_file import scan_file


async def scan_all_directories(cursor: RainwaveCursor, art_only: bool = False) -> None:
    for directory, sids in config.song_dirs.items():
        for root, _subdirs, files in os.walk(directory, followlinks=True):
            for filename in files:
                filename = os.path.join(root, filename)
                if art_only and not is_image(filename):
                    pass
                else:
                    await scan_file(cursor, filename, sids)
