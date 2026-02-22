from contextlib import asynccontextmanager
import pickle
import emcache
from common import config
from api.exceptions import APIException
from typing import Any
from .test_mode_cache import TestModeCache

client: emcache.Client | TestModeCache | None = None

in_memory: dict[bytes, Any] = {}


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
            client = TestModeCache()
        else:
            client = await _build_emcache_client(
                config.memcache_host, config.memcache_port
            )
        yield client
    finally:
        if client:
            await client.close()


async def cache_close() -> None:
    global client
    if client:
        await client.close()


async def cache_set(key: str, value: Any, *, save_in_memory: bool = False) -> None:
    global client

    if not client:
        raise APIException("internal_error", "No memcache connection.", http_code=500)

    bytes_key = key.encode("utf-8")
    if save_in_memory or bytes_key in in_memory:
        in_memory[bytes_key] = value

    await client.set(bytes_key, pickle.dumps(value))


async def cache_get(key: str) -> Any:
    if not client:
        raise APIException("internal_error", "No memcache connection.", http_code=500)

    bytes_key = key.encode("utf-8")
    if bytes_key in in_memory:
        return in_memory[bytes_key]

    result = await client.get(bytes_key)
    if result is None:
        return None
    return pickle.loads(result.value)
