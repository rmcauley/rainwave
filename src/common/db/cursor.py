from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Sequence, Mapping, cast
from psycopg import AsyncCursor, sql
from psycopg.rows import DictRow, dict_row
from psycopg.abc import QueryNoTemplate
from .connection import get_pool


class RainwaveCursor:
    def __init__(self, cursor: AsyncCursor[DictRow]):
        self._cursor = cursor

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

    async def fetch_guaranteed[T](
        self,
        query: QueryNoTemplate,
        params: Sequence[Any] | Mapping[str, Any] | None,
        default: T,
        *,
        var_type: type[T],
    ) -> T:
        await self._cursor.execute(query, params)
        if self._cursor.rowcount <= 0 or not self._cursor.rowcount:
            return default
        r = await self._cursor.fetchone()
        if not r:
            return default
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

    async def for_each_row[T](
        self,
        query: QueryNoTemplate,
        params: Sequence[Any] | Mapping[str, Any] | None = None,
        *,
        row_type: type[T],
    ) -> AsyncIterator[T]:
        await self._cursor.execute(query, params)
        while True:
            row = await self._cursor.fetchone()
            if not row:
                break
            yield cast(T, row)

    async def begin_transaction(self):
        await self._cursor.execute("BEGIN")

    async def commit_transaction(self):
        await self._cursor.execute("COMMIT")

    async def rollback_transaction(self):
        await self._cursor.execute("ROLLBACK")

    async def get_nextval(self, sequence_name: str) -> int:
        return await self.fetch_guaranteed(
            sql.SQL("SELECT nextval(%s::regclass)").format(
                sql.Identifier(sequence_name)
            ),
            params=None,
            default=0,
            var_type=int,
        )


@asynccontextmanager
async def get_cursor():
    pool = get_pool()
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as psy_cursor:
            yield RainwaveCursor(psy_cursor)


async def get_tx_cursor():
    pool = get_pool()
    async with pool.connection() as conn:
        async with conn.transaction():
            async with conn.cursor(row_factory=dict_row) as psy_cursor:
                yield RainwaveCursor(psy_cursor)
