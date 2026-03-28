from contextlib import asynccontextmanager
import pickle
import emcache
from common import config
from api.exceptions import APIException
from typing import Any
from .in_memory_cache import InMemoryCache

client: emcache.Client | InMemoryCache | None = None


async def _build_emcache_client(host: str, port: int) -> emcache.Client:
    client = await emcache.create_client(
        [emcache.MemcachedHostAddress(host, port)],
        connection_timeout=config.memcache_connect_timeout,
        timeout=config.memcache_timeout,
    )
    # memcache doesn't test its connection on start, so we force a get
    await client.get(b"hello")
    return client


@asynccontextmanager
async def cache_connect():
    global client
    if client:
        raise APIException(
            "internal_error", "cache_connect was called twice.", http_code=500
        )

    try:
        if config.memcache_fake:
            client = InMemoryCache()
        else:
            client = await _build_emcache_client(
                config.memcache_host, config.memcache_port
            )
        yield client
    finally:
        if client:
            await client.close()
            client = None


async def cache_set(key: str, value: Any) -> None:
    global client

    if not client:
        raise APIException("internal_error", "No memcache connection.", http_code=500)

    await client.set(key.encode("utf-8"), pickle.dumps(value))


async def cache_get(key: str) -> Any:
    if not client:
        raise APIException("internal_error", "No memcache connection.", http_code=500)

    result = await client.get(key.encode("utf-8"))
    if result is None:
        return None
    return pickle.loads(result.value)
