from contextlib import asynccontextmanager
from typing import AsyncGenerator

from psycopg import AsyncConnection
from psycopg.rows import dict_row

from common import config
from common.db.cursor import RainwaveCursor


def _conninfo() -> str:
    parts = ["sslmode=disable", f"dbname={config.db_name}"]
    if config.db_host:
        parts.append(f"host={config.db_host}")
    if config.db_port:
        parts.append(f"port={config.db_port}")
    if config.db_user:
        parts.append(f"user={config.db_user}")
    if config.db_password:
        parts.append(f"password={config.db_password}")
    return " ".join(parts)


@asynccontextmanager
async def get_test_cursor() -> AsyncGenerator[RainwaveCursor]:
    async with await AsyncConnection.connect(_conninfo(), autocommit=True) as conn:
        async with conn.cursor(row_factory=dict_row) as cursor:
            yield RainwaveCursor(cursor)
