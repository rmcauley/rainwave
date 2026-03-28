from contextlib import asynccontextmanager
import pickle
import emcache
from common import config
from api.exceptions import APIException
from typing import Any

client: emcache.Client | None = None


@asynccontextmanager
async def cache_connect():
    global client
    if client:
        raise APIException(
            "internal_error", "cache_connect was called twice.", status_code=500
        )

    try:
        client = await emcache.create_client(
            [emcache.MemcachedHostAddress(config.memcache_host, config.memcache_port)],
            connection_timeout=config.memcache_connect_timeout,
            timeout=config.memcache_timeout,
        )
        # memcache doesn't test its connection on start, so we force a get
        await client.get(b"hello")
        yield client
    finally:
        if client:
            await client.close()
            client = None


async def cache_set(key: str, value: Any) -> None:
    global client

    if not client:
        raise APIException("internal_error", "No memcache connection.", status_code=500)

    await client.set(key.encode("utf-8"), pickle.dumps(value))


async def cache_get(key: str) -> Any:
    if not client:
        raise APIException("internal_error", "No memcache connection.", status_code=500)

    result = await client.get(key.encode("utf-8"))
    if result is None:
        return None
    if isinstance(result, bytes):
        return pickle.loads(result)
    return pickle.loads(result.value)


async def cache_flush_all() -> None:
    global client

    if not client:
        raise APIException("internal_error", "No memcache connection.", status_code=500)

    await client.flush_all(
        emcache.MemcachedHostAddress(config.memcache_host, config.memcache_port)
    )
