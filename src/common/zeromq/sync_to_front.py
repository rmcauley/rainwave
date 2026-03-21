from . import zeromq


def sync_frontend_all(sid: int) -> None:
    zeromq.publish({"action": "update_all", "sid": sid})


def sync_frontend_user_id(user_id: int) -> None:
    zeromq.publish({"action": "update_user", "user_id": user_id})


def sync_frontend_key(key: str) -> None:
    zeromq.publish({"action": "update_listen_key", "listen_key": key})
