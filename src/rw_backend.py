import argparse
from pathlib import Path

from dotenv import load_dotenv

from backend.server import BackendServer


def main() -> None:
    parser = argparse.ArgumentParser(description="Rainwave song change API server.")
    parser.add_argument("--testmode", action="store_true", default=False)
    args = parser.parse_args()

    if args.testmode:
        repo_root = Path(__file__).resolve().parents[1]
        load_dotenv(repo_root / ".env.test")

    from common import config

    per_station_logging = True
    station_id_list = list(config.stations.keys())
    enable_periodic_jobs = True

    if args.testmode:
        per_station_logging = False
        station_id_list = [config.default_station]
        enable_periodic_jobs = False

    BackendServer().start(
        per_station_logging=per_station_logging,
        station_id_list=station_id_list,
        enable_periodic_jobs=enable_periodic_jobs,
    )


if __name__ == "__main__":
    main()
