import sys
from pathlib import Path

import pytest
from testcontainers.postgres import PostgresContainer

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.cache import cache
from src.backend.libs.db.connection import db_connect
from src.backend.libs.db.schema import create_tables
from src.backend.libs import locale as api_locale
from src.backend.libs import log, zeromq
from src.backend.playlist import playlist
from backend.schedule import schedule
from .seed_data import populate_test_data
from src.backend import cooldown


@pytest.fixture(scope="session")
def postgres_container():
    with PostgresContainer("postgres:16-alpine") as postgres:
        yield postgres


def _load_api_requests():
    # This needs to come after cache and DB are connected.
    # You cannot have a conditional import * which is what
    # the API request loader needs, so it needs to be in a separate module here.
    import tests.load_all_api_requests  # pyright: ignore[reportUnusedImport]

    pass


@pytest.fixture(scope="session", autouse=True)
async def rainwave_db():
    log.init(loglevel="critical")
    _load_api_requests()
    cache.connect()
    await db_connect(auto_retry=False)
    await create_tables()
    populate_test_data(db.c, sid=1)
    api_locale.load_translations()
    zeromq.init_pub()
    cooldown.prepare_cooldown_algorithm(1)
    schedule.load()
    schedule.advance_station(1)
    schedule.post_process(1)
    playlist.update_num_songs()
    cache.set_station(1, "all_albums", playlist.get_all_albums_list(1), True)
    cache.set_station(1, "all_artists", playlist.get_all_artists_list(1), True)
    cache.set_station(1, "all_groups", playlist.get_all_groups_list(1), True)
    cache.set_station(1, "all_groups_power", playlist.get_all_groups_for_power(1), True)
    cache.set_global(
        "all_stations_info",
        {
            1: {
                "title": None,
                "album": None,
                "art": None,
                "artists": None,
                "event_name": None,
                "event_type": None,
            }
        },
        save_local=True,
    )
    yield
    db.close()
    log.close()
