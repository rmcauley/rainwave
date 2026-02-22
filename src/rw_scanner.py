import argparse
import asyncio

from common.cache import cache
from common.db.connection import db_connect
from scanner.filemonitor import (
    monitor,
    set_on_screen,
    full_art_update,
    full_music_scan,
)
from common import config, log


async def main() -> None:
    parser = argparse.ArgumentParser(description="Rainwave song scanning daemon.")
    parser.add_argument("--full", action="store_true")
    parser.add_argument("--reset", action="store_true")
    parser.add_argument("--art", action="store_true")
    args = parser.parse_args()

    on_screen = args.art or args.full or args.reset

    log.init(
        None if on_screen else "rw_scanner.log",
        "debug" if on_screen else config.log_level,
    )

    async with db_connect(), cache.cache_connect():
        set_on_screen(on_screen)
        if args.art:
            full_art_update()
        elif args.full:
            full_music_scan(args.reset)
        else:
            monitor()


if __name__ == "__main__":
    asyncio.run(main())
