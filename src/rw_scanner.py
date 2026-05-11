import argparse
import asyncio
import logging

from common.cache import cache
from common.db.connection import db_connect
from common import config, log
from scanner.file_monitor.file_monitor import file_monitor
from scanner.full_art_scan import full_art_update
from scanner.full_scan import full_scan


async def main() -> None:
    parser = argparse.ArgumentParser(description="Rainwave song scanning daemon.")
    parser.add_argument("--full", action="store_true")
    parser.add_argument("--reset", action="store_true")
    parser.add_argument("--art", action="store_true")
    args = parser.parse_args()

    on_screen = args.art or args.full or args.reset

    log.init(
        None if on_screen else "rw_scanner.log",
        log_file_level=config.log_file_level,
        log_stdout_level=logging.DEBUG if on_screen else config.log_stdout_level,
    )

    async with db_connect(), cache.cache_connect():
        if args.art:
            await full_art_update()
        elif args.full:
            await full_scan(args.reset)
        else:
            await file_monitor()


if __name__ == "__main__":
    asyncio.run(main())
