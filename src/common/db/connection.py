import asyncio

from psycopg import OperationalError, InterfaceError
from psycopg_pool import AsyncConnectionPool

from common import config
from common import log

db_pool: AsyncConnectionPool | None = None


def get_pool() -> AsyncConnectionPool:
    if not db_pool:
        raise RuntimeError("DB pool is not connected")
    return db_pool


async def db_connect(
    auto_retry: bool = True, retry_only_this_time: bool = False
) -> None:
    global db_pool

    if db_pool:
        return

    name = config.db_name
    host = config.db_host
    port = config.db_port
    user = config.db_user
    password = config.db_password

    conninfo = "sslmode=disable "
    if host:
        conninfo += "host=%s " % host
    if port:
        conninfo += "port=%s " % port
    if user:
        conninfo += "user=%s " % user
    if password:
        conninfo += "password=%s " % password
    conninfo += f"dbname={name}"

    connected = False
    while not connected:
        try:
            db_pool = AsyncConnectionPool(
                conninfo,
                min_size=1,
                max_size=20,
                open=False,
                kwargs={"autocommit": True},
            )
            await db_pool.open(True)
            connected = True
        except (OperationalError, InterfaceError) as e:
            log.exception("psycopg", "Psycopg connection error", e)
            if auto_retry or retry_only_this_time:
                await asyncio.sleep(1)
            else:
                raise


async def db_close() -> bool:
    global db_pool
    if db_pool:
        await db_pool.close()
    db_pool = None
    return True
