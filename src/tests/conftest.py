import asyncio
import os
import socket
import subprocess
import sys
import time
from contextlib import AsyncExitStack
from pathlib import Path
from typing import TextIO

import pytest
from psycopg import connect, sql
from testcontainers.postgres import PostgresContainer
from dotenv import load_dotenv

from api.helpers.cached_all_artists import update_all_artists_cache
from api.helpers.cached_all_groups import update_all_groups_cache
from api.routes import load_all_routes
from common import config, log
from common.db.connection import db_connect
from common.db.cursor import get_cursor
from common.db.schema import create_tables
from common.playlist.cooldown_config import prepare_cooldown_algorithm
from common.playlist.object_counts import update_playlist_object_counts
from common.schedule.advance_timeline import (
    advance_timeline,
    advance_timeline_post_process,
)
from common.schedule.timeline import load_timeline
from tests.seed_data import populate_test_data

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from common.cache import cache

load_dotenv(PROJECT_ROOT.parent / ".env.test")

_postgres_container: PostgresContainer | None = None
_exit_stack: AsyncExitStack | None = None
_api_server_process: subprocess.Popen[str] | None = None
_api_server_log: TextIO | None = None


def _progress(message: str) -> None:
    print(f"[pytest setup] {message}", flush=True)


def _get_test_api_port() -> int:
    return int(os.getenv("RW_TEST_API_PORT", "24000"))


def _configure_local_postgres() -> None:
    config.db_host = os.getenv("RW_TEST_DB_HOST", None)
    config.db_port = os.getenv("RW_TEST_DB_PORT", None)
    config.db_user = os.getenv("RW_TEST_DB_USER", None)
    config.db_password = os.getenv("RW_TEST_DB_PASSWORD", None)
    config.db_name = os.getenv("RW_TEST_DB_NAME", "rainwave_test")


def _recreate_local_test_database() -> None:
    admin_db = os.getenv("RW_TEST_ADMIN_DB", "postgres")

    conninfo_parts = [f"dbname={admin_db}"]
    if config.db_host is not None:
        conninfo_parts.append(f"host={config.db_host}")
    if config.db_port is not None:
        conninfo_parts.append(f"port={config.db_port}")
    if config.db_user is not None:
        conninfo_parts.append(f"user={config.db_user}")
    if config.db_password is not None:
        conninfo_parts.append(f"password={config.db_password}")

    conninfo = " ".join(conninfo_parts)

    with connect(conninfo, autocommit=True) as admin_conn:
        with admin_conn.cursor() as cur:
            _progress(f"terminating existing connections to {config.db_name}")
            cur.execute(
                """
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = %s AND pid <> pg_backend_pid()
                """,
                (config.db_name,),
            )
            _progress(f"dropping database {config.db_name} if it exists")
            cur.execute(
                sql.SQL("DROP DATABASE IF EXISTS {}").format(
                    sql.Identifier(config.db_name)
                )
            )
            _progress(f"creating database {config.db_name}")
            cur.execute(
                sql.SQL("CREATE DATABASE {}").format(sql.Identifier(config.db_name))
            )


async def _setup_rainwave_state() -> None:
    global _exit_stack
    assert _exit_stack is not None

    log.init(loglevel="critical")
    load_all_routes()
    _progress("opening database and cache connections")
    await _exit_stack.enter_async_context(db_connect(auto_retry=False))
    await _exit_stack.enter_async_context(cache.cache_connect())
    _progress("clearing memcache state")
    await cache.cache_flush_all()
    _progress("creating database schema")
    await create_tables()
    async with get_cursor() as cursor:
        _progress("seeding test data")
        await populate_test_data(cursor, sid=1)
        _progress("building playlist state")
        await update_playlist_object_counts()
        await prepare_cooldown_algorithm(cursor, 1)
        _progress("building timeline state")
        await load_timeline(cursor, 1)
        await advance_timeline(1, trigger_post_process=False)
        await advance_timeline_post_process(1)
        _progress("warming API caches")
        await update_all_artists_cache()
        await update_all_groups_cache()


def _start_test_api_server() -> None:
    global _api_server_process
    global _api_server_log

    env = os.environ.copy()
    env["RW_TEST_API_PORT"] = str(_get_test_api_port())
    env["RW_TEST_API_BASE_URL"] = f"http://127.0.0.1:{_get_test_api_port()}"
    api_server_log_path = Path("/tmp") / "rainwave-test-api-server.log"

    _progress(f"starting API server on port {_get_test_api_port()}")
    _api_server_log = api_server_log_path.open("w", encoding="utf-8")
    _api_server_process = subprocess.Popen(
        ["uv", "run", "python", "src/rw_api.py", "--testmode"],
        cwd=PROJECT_ROOT.parent,
        env=env,
        stdout=_api_server_log,
        stderr=subprocess.STDOUT,
        text=True,
    )
    os.environ["RW_TEST_API_BASE_URL"] = env["RW_TEST_API_BASE_URL"]

    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        if _api_server_process.poll() is not None:
            break
        try:
            with socket.create_connection(
                ("127.0.0.1", _get_test_api_port()), timeout=1
            ):
                _progress("API server ready")
                return
        except OSError:
            time.sleep(0.2)

    if _api_server_log is not None:  # pyright: ignore[reportUnnecessaryComparison]
        _api_server_log.flush()
    log_output = api_server_log_path.read_text(encoding="utf-8")
    raise RuntimeError(
        "Test API server failed to become ready.\n"
        + f"Log output from {api_server_log_path}:\n{log_output}"
    )


def pytest_sessionstart(session: pytest.Session) -> None:
    global _postgres_container
    global _exit_stack

    postgres_mode = os.getenv("RW_TEST_POSTGRES_MODE", "postgres")
    if postgres_mode == "local":
        _configure_local_postgres()
        _progress("using already running local postgres")
        _recreate_local_test_database()
    else:
        _progress("starting postgres test container")
        _postgres_container = PostgresContainer(
            "postgres:16-alpine",
            username=config.db_user,
            password=config.db_password,
            dbname=config.db_name,
            driver=None,
        )
        _postgres_container.start()

        config.db_host = _postgres_container.get_container_host_ip()
        config.db_port = str(_postgres_container.get_exposed_port(5432))

    _progress(
        f"postgres ready on {config.db_host}:{config.db_port} db={config.db_name}"
    )

    _exit_stack = AsyncExitStack()
    asyncio.run(_setup_rainwave_state())
    _start_test_api_server()
    _progress("global test setup complete")


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    global _api_server_process
    global _api_server_log
    global _postgres_container
    global _exit_stack

    if _exit_stack is not None:
        _progress("closing database and cache connections")
        asyncio.run(_exit_stack.aclose())
        _exit_stack = None

    if _api_server_process is not None:
        _progress("stopping API server")
        _api_server_process.terminate()
        try:
            _api_server_process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            _api_server_process.kill()
            _api_server_process.wait(timeout=5)
        _api_server_process = None
    if _api_server_log is not None:
        _api_server_log.close()
        _api_server_log = None

    if _postgres_container is not None:
        _progress("stopping postgres test container")
        _postgres_container.stop()
        _postgres_container = None
