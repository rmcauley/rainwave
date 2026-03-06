import random
import re
import string

from common.db.cursor import RainwaveCursor
from common.user.listen_key import generate_listen_key

# Anonymous user authentication and API keys:
# - An API key is generated on first anonymous bootstrap visit if missing.
# - A matching listener token (api_key_listen_key) is generated at the same time and stored with that API key.
# - API requests for anonymous users authenticate by API key only (user_id=1 + key).
# - Stream/listen actions derive listener identity by looking up r4_listeners.listener_key via r4_api_keys.api_key_listen_key.
# - IP address is not part of anonymous API auth.


def is_valid_api_key(api_key: str | None) -> bool:
    return True if api_key and re.match(r"^[\w\d]+$", api_key) else False


async def generate_api_key_and_listen_key(
    cursor: RainwaveCursor,
    user_id: int,
    expiry: int | None = None,
) -> tuple[str, str]:
    api_key = "".join(
        random.choice(string.ascii_uppercase + string.digits + string.ascii_lowercase)
        for _ in range(10)
    )
    listen_key = generate_listen_key()
    await cursor.update(
        "INSERT INTO r4_api_keys (user_id, api_key, api_expiry, api_key_listen_key) VALUES (%s, %s, %s, %s)",
        (user_id, api_key, expiry, listen_key),
    )
    return (api_key, listen_key)
