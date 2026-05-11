import asyncio
import logging

from common import log
from common.db.connection import db_connect
from common.db.schema import create_tables


async def main() -> None:
    log.init(log_stdout_level=logging.DEBUG)
    async with db_connect(auto_retry=False):
        await create_tables()
    print()
    print("Done")
    print()


if __name__ == "__main__":
    asyncio.run(main())
