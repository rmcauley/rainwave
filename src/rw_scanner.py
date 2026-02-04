import argparse

from backend.cache import cache
from src.scanner.filemonitor import (
    monitor,
    set_on_screen,
    full_art_update,
    full_music_scan,
)
from src.backend import config
from src.backend.libs import log, db
from backend.playlist.album.album import clear_updated_albums

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Rainwave song scanning daemon.")
    parser.add_argument("--full", action="store_true")
    parser.add_argument("--reset", action="store_true")
    parser.add_argument("--art", action="store_true")
    args = parser.parse_args()

    on_screen = args.art or args.full

    log.init(
        None if on_screen else "rw_scanner.log",
        "debug" if on_screen else config.log_level,
    )

    for sid in config.station_ids:
        clear_updated_albums(sid)

    try:
        db.connect()
        cache.connect()

        set_on_screen(on_screen)

        if args.art:
            full_art_update()
        elif args.full:
            full_music_scan(args.reset)
        else:
            monitor()
    finally:
        db.close()
        log.close()
