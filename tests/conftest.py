from __future__ import annotations

import json
import sys
from pathlib import Path
from urllib.parse import urlparse

import pytest
from testcontainers.postgres import PostgresContainer

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from api import locale as api_locale  # noqa: E402
from libs import cache, config, db, log, zeromq  # noqa: E402
from rainwave import playlist, schedule  # noqa: E402
from tests.seed_data import populate_test_data  # noqa: E402
from rainwave.playlist_objects import cooldown

TEMPLATE_CONFIG = Path(__file__).parent / "fixtures" / "rainwave_test.template.json"


@pytest.fixture(scope="session")
def postgres_container():
    with PostgresContainer("postgres:16-alpine") as postgres:
        yield postgres


@pytest.fixture(scope="session")
def rainwave_config_path(tmp_path_factory, postgres_container):
    config_data = json.loads(TEMPLATE_CONFIG.read_text())

    parsed = urlparse(postgres_container.get_connection_url())
    config_data["db_host"] = parsed.hostname or "127.0.0.1"
    config_data["db_port"] = parsed.port or 5432
    config_data["db_user"] = parsed.username or "rainwave"
    config_data["db_password"] = parsed.password or "rainwave"
    config_data["db_name"] = (parsed.path or "").lstrip("/") or "rainwave_test"

    config_path = tmp_path_factory.mktemp("rainwave_config") / "rainwave_test.conf"
    config_path.write_text(json.dumps(config_data, indent=2))
    return config_path


def _load_api_requests():
    import tests.load_all_api_requests

    pass


@pytest.fixture(scope="session", autouse=True)
def rainwave_db(rainwave_config_path):
    log.init(loglevel="critical")
    config.load(filename=str(rainwave_config_path))
    _load_api_requests()
    cache.connect()
    db.connect(auto_retry=False)
    db.create_tables()
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
