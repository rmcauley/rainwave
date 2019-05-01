from libs import zeromq


def sync_frontend_all(sid):
    zeromq.publish({"action": "update_all", "sid": sid})


def sync_frontend_ip(ip_address):
    zeromq.publish({"action": "update_ip", "ip": ip_address})


def sync_frontend_user_id(user_id):
    zeromq.publish({"action": "update_user", "user_id": user_id})


def sync_frontend_dj(sid):
    zeromq.publish({"action": "update_dj", "sid": sid})


def sync_frontend_key(key):
    zeromq.publish({"action": "update_listen_key", "listen_key": key})
