import sys
from pathlib import Path

import pytest
from testcontainers.postgres import PostgresContainer

from api.helpers.cached_all_artists import update_all_artists_cache
from api.helpers.cached_all_groups import update_all_groups_cache
from api.routes import load_all_routes
from common import log
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


@pytest.fixture(scope="session")
def postgres_container():
    with PostgresContainer("postgres:16-alpine") as postgres:
        yield postgres


@pytest.fixture(scope="session", autouse=True)
async def rainwave_db():
    log.init(loglevel="critical")
    load_all_routes()
    async with db_connect(auto_retry=False), cache.cache_connect():
        await create_tables()
        async with get_cursor() as cursor:
            await populate_test_data(cursor, sid=1)
            await update_playlist_object_counts()
            await prepare_cooldown_algorithm(cursor, 1)
            await load_timeline(cursor, 1)
            await advance_timeline(1, trigger_post_process=False)
            await advance_timeline_post_process(1)
            await update_all_artists_cache()
            await update_all_groups_cache()
            yield
