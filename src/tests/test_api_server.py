# pyright: reportAttributeAccessIssue=false

from unittest.mock import patch

from api.server import APIServer


def test_api_server_start_creates_forked_children() -> None:
    with patch("api.server.run_forked_processes") as run_forked_processes:
        APIServer().start(
            per_port_logging=True,
            api_num_processes=2,
            enable_periodic_jobs=True,
        )

    process_specs = run_forked_processes.call_args.args[0]
    assert [spec.name for spec in process_specs] == [
        "rainwave-api-0",
        "rainwave-api-1",
    ]
    assert process_specs[0].kwargs == {
        "task_id": 0,
        "per_port_logging": True,
        "enable_periodic_jobs": True,
    }
    assert process_specs[1].kwargs == {
        "task_id": 1,
        "per_port_logging": True,
        "enable_periodic_jobs": True,
    }
