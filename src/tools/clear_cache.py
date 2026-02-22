import asyncio

from common import log
from common.cache.cache import cache_connect
from common.cache.reset_station_caches import reset_station_caches


async def main() -> None:
    log.init(None, "print")
    await cache_connect()
    await reset_station_caches()
    print()
    print("Done")
    print()


if __name__ == "__main__":
    asyncio.run(main())
