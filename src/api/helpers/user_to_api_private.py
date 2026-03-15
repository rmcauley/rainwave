from api import rainwave_typeddicts
from common.user.model.user_base import UserBase


def user_to_api_private(user: UserBase) -> rainwave_typeddicts.UserInfo:
    public_data = user.public_data
    private_data = user.private_data
    return {
        "admin": private_data["admin"],
        "avatar": public_data["avatar"],
        "id": user.id,
        "listen_key": private_data["listen_key"],
        "listener_id": 0,
        "lock_counter": private_data["lock_counter"],
        "lock_in_effect": private_data["lock_in_effect"],
        "lock_sid": private_data["lock_sid"],
        "lock": private_data["lock"],
        "name": public_data["name"],
        "new_privmsg": False,
        "perks": private_data["perks"],
        "rate_anything": private_data["rate_anything"],
        "request_expires_at": private_data["request_expires_at"],
        "request_position": private_data["request_position"],
        "requests_paused": private_data["requests_paused"],
        "sid": private_data["sid"],
        "tuned_in": private_data["tuned_in"],
        "voted_entry": private_data["voted_entry"],
    }
