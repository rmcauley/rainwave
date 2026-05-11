import asyncio
import argparse
from pathlib import Path
import tempfile
from dotenv import load_dotenv

from api.helpers import csp_header


def main() -> None:
    parser = argparse.ArgumentParser(description="Rainwave API server.")
    parser.add_argument("--testmode", action="store_true", default=False)
    args = parser.parse_args()

    if args.testmode:
        repo_root = Path(__file__).resolve().parents[1]
        load_dotenv(repo_root / ".env.test")

    # Importing here ensures that dotenv has had a chance to do its work first.
    from api.routes import load_all_routes
    from api.server import APIServer
    from common import config, log

    startup_log = "rw_api_startup.log"
    per_port_logging = True
    api_num_processes = config.api_num_processes
    enable_periodic_jobs = True

    if args.testmode:
        startup_log = str(Path(tempfile.gettempdir()) / "rw_test_api.log")
        per_port_logging = False
        api_num_processes = 1
        enable_periodic_jobs = False

    log.init(
        startup_log,
        log_file_level=config.log_file_level,
        log_stdout_level=config.log_stdout_level,
    )

    if not args.testmode:
        log.info("csp", csp_header.csp_header)

    load_all_routes()
    server = APIServer()
    asyncio.run(server.warmup())

    if per_port_logging:
        log.shutdown()

    server.start(
        per_port_logging=per_port_logging,
        api_num_processes=api_num_processes,
        enable_periodic_jobs=enable_periodic_jobs,
    )


if __name__ == "__main__":
    main()
