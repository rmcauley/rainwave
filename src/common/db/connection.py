from psycopg import AsyncConnection, OperationalError, InterfaceError
import time

from common import config
from common.libs import log

db_connection: AsyncConnection = None  # type: ignore
connected = False


async def db_connect(
    auto_retry: bool = True, retry_only_this_time: bool = False
) -> bool:
    global db_connection
    global connected

    if db_connection and connected:
        return True

    name = config.db_name
    host = config.db_host
    port = config.db_port
    user = config.db_user
    password = config.db_password

    base_connstr = "sslmode=disable "
    if host:
        base_connstr += "host=%s " % host
    if port:
        base_connstr += "port=%s " % port
    if user:
        base_connstr += "user=%s " % user
    if password:
        base_connstr += "password=%s " % password
    connected = False
    while not connected:
        try:
            db_connection = await AsyncConnection.connect(
                base_connstr + ("dbname=%s" % name), connect_timeout=1
            )
            db_connection.autocommit = True
            connected = True
        except (OperationalError, InterfaceError) as e:
            log.exception("psycopg", "Psycopg exception", e)
            if auto_retry or retry_only_this_time:
                time.sleep(1)
            else:
                raise
    return True


async def db_close() -> bool:
    global db_connection
    global connected

    if db_connection:
        await db_connection.close()
    db_connection = None  # type: ignore
    connected = False

    return True


__all__ = ["db_connect", "db_close", "db_connection"]
