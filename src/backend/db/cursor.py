from contextlib import asynccontextmanager, contextmanager
from typing import Any, Sequence, Mapping, cast
from psycopg import AsyncCursor
from psycopg.rows import dict_row
from psycopg.abc import QueryNoTemplate
from .connection import db_connection


class RainwaveCursorBase:
    auto_retry = True
    disconnected = False

    def __init__(self):
        self._connection = db_connection
        self._cursor = AsyncCursor(db_connection, row_factory=dict_row)

    async def execute(
        self,
        query: QueryNoTemplate,
        params: Sequence[Any] | Mapping[str, Any] | None = None,
    ) -> None:
        await self._cursor.execute(query, params)

    async def fetch_next_row[T](self, *, row_type: type[T]) -> T:
        return cast(T, await self._cursor.fetchone())

    async def fetch_var[T](
        self,
        query: QueryNoTemplate,
        params: Sequence[Any] | Mapping[str, Any] | None = None,
        *,
        var_type: type[T],
    ) -> T | None:
        await self._cursor.execute(query, params)
        if self._cursor.rowcount <= 0 or not self._cursor.rowcount:
            return None
        r = await self._cursor.fetchone()
        if not r:
            return None
        return r[next(iter(r.keys()))]

    async def fetch_row[T](
        self,
        query: QueryNoTemplate,
        params: Sequence[Any] | Mapping[str, Any] | None = None,
        *,
        row_type: type[T],
    ) -> T | None:
        await self._cursor.execute(query, params)
        if self._cursor.rowcount <= 0 or not self._cursor.rowcount:
            return None
        return cast(T, await self._cursor.fetchone())

    async def fetch_all[T](
        self,
        query: QueryNoTemplate,
        params: Sequence[Any] | Mapping[str, Any] | None = None,
        *,
        row_type: type[T],
    ) -> list[T]:
        await self._cursor.execute(query, params)
        if self._cursor.rowcount <= 0 or not self._cursor.rowcount:
            return []
        return cast(list[T], await self._cursor.fetchall())

    async def fetch_list[T](
        self,
        query: QueryNoTemplate,
        params: Sequence[Any] | Mapping[str, Any] | None = None,
        *,
        row_type: type[T],
    ) -> list[T]:
        await self._cursor.execute(query, params)
        if self._cursor.rowcount <= 0 or not self._cursor.rowcount:
            return []
        arr: list[T] = []
        row = await self._cursor.fetchone()
        if not row:
            return []
        col = next(iter(row.keys()))
        arr.append(row[col])
        for row in await self._cursor.fetchall():
            arr.append(row[col])
        return arr

    async def update(
        self,
        query: QueryNoTemplate,
        params: Sequence[Any] | Mapping[str, Any] | None = None,
    ) -> int:
        await self._cursor.execute(query, params)
        return self._cursor.rowcount


class RainwaveCursor(RainwaveCursorBase):
    pass


class RainwaveCursorTx(RainwaveCursorBase):
    pass


@contextmanager
def get_cursor():
    cursor = RainwaveCursor()
    yield cursor


@asynccontextmanager
async def get_tx_cursor():
    cursor = RainwaveCursorTx()
    await cursor.execute("BEGIN")
    try:
        yield cursor
        await cursor.execute("COMMIT")
    except:
        await cursor.execute("ROLLBACK")
        raise
