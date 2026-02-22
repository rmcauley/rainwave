import argparse
import asyncio

from common import log
from common.cache.cache import cache_connect
from common.db.connection import db_connect
from common.db.cursor import get_cursor
from common.playlist.remove_all_locks import remove_all_locks


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Removes all election blocks and cooldowns."
    )
    parser.add_argument("--sid", type=int)
    args = parser.parse_args()
    log.init()
    async with db_connect(auto_retry=False), cache_connect(), get_cursor() as cursor:
        await remove_all_locks(cursor, args.sid)
    print()
    print("Done.")
    print()


if __name__ == "__main__":
    asyncio.run(main())
