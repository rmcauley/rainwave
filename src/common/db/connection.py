import asyncio
from contextlib import asynccontextmanager

from psycopg import OperationalError, InterfaceError
from psycopg_pool import AsyncConnectionPool

from api.exceptions import APIException
from common import config
from common import log

db_pool: AsyncConnectionPool | None = None

db_connection_errors = (OperationalError, InterfaceError)


def get_pool() -> AsyncConnectionPool:
    if not db_pool:
        raise APIException("internal_error", "No database connection.", http_code=500)
    return db_pool


@asynccontextmanager
async def db_connect(auto_retry: bool = True):
    global db_pool
    if db_pool:
        raise APIException(
            "internal_error", "db_connect was called twice.", http_code=500
        )

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
            yield db_pool
        except db_connection_errors as e:
            log.exception("psycopg", "Psycopg connection error", e)
            if auto_retry:
                await asyncio.sleep(1)
            else:
                raise
        finally:
            if db_pool:
                await db_pool.close()
