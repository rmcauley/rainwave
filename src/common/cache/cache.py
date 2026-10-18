import asyncio
from contextlib import asynccontextmanager
import pickle
import aiomcache
from common import config
from api.exceptions import APIException
from typing import Any

client: aiomcache.Client | None = None


@asynccontextmanager
async def cache_connect():
    global client
    if client:
        raise APIException(
            "internal_error", "cache_connect was called twice.", status_code=500
        )

    try:
        client = aiomcache.Client(config.memcache_host, config.memcache_port)
        # aiomcache connects lazily, so we force a get to test the connection
        await asyncio.wait_for(
            client.get(b"hello"), timeout=config.memcache_connect_timeout
        )
        yield client
    finally:
        if client:
            await client.close()
            client = None


async def cache_set(key: str, value: Any) -> None:
    global client

    if not client:
        raise APIException("internal_error", "No memcache connection.", status_code=500)

    await asyncio.wait_for(
        client.set(key.encode("utf-8"), pickle.dumps(value)),
        timeout=config.memcache_timeout,
    )


async def cache_get(key: str) -> Any:
    if not client:
        raise APIException("internal_error", "No memcache connection.", status_code=500)

    result = await asyncio.wait_for(
        client.get(key.encode("utf-8")), timeout=config.memcache_timeout
    )
    if result is None:
        return None
    return pickle.loads(result)


async def cache_flush_all() -> None:
    global client

    if not client:
        raise APIException("internal_error", "No memcache connection.", status_code=500)

    await asyncio.wait_for(client.flush_all(), timeout=config.memcache_timeout)
