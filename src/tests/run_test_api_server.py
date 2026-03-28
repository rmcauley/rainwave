import os
import sys
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]
SRC_ROOT = REPO_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

load_dotenv(REPO_ROOT / ".env.test")

from api.server import APIServer
from common import config


def configure_test_server() -> None:
    config.db_host = os.getenv("RW_TEST_DB_HOST", None)
    config.db_port = os.getenv("RW_TEST_DB_PORT", None)
    config.db_user = os.getenv("RW_TEST_DB_USER", None)
    config.db_password = os.getenv("RW_TEST_DB_PASSWORD", None)
    config.db_name = os.getenv("RW_TEST_DB_NAME", "rainwave_test")
    config.api_base_port = int(os.getenv("RW_TEST_API_PORT", "24000"))
    config.api_num_processes = 1
    config.developer_mode = False


if __name__ == "__main__":
    configure_test_server()
    APIServer().start()
