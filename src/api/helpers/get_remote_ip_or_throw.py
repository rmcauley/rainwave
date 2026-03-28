from typing import Any

from api import fieldtypes
from api.exceptions import APIException


def get_remote_ip_or_throw(ip_address: Any) -> str:
    ip_address_str = fieldtypes.ip_address(ip_address)
    if not ip_address_str:
        raise APIException(
            "auth_failed",
            "Anonymous users need their IP address visible to Rainwave.",
            status_code=400,
        )
    return ip_address_str
