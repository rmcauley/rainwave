import re


def check_is_valid_api_key(api_key: str | None) -> bool:
    return True if api_key and re.match(r"^[\w\d]+$", api_key) else False
