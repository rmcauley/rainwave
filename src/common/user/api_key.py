import random
import re
import string

from common.db.cursor import RainwaveCursor


def check_is_valid_api_key(api_key: str | None) -> bool:
    return True if api_key and re.match(r"^[\w\d]+$", api_key) else False


async def generate_api_key(
    cursor: RainwaveCursor,
    user_id: int,
    expiry: int | None = None,
    reuse: str | None = None,
) -> str:
    api_key = reuse or "".join(
        random.choice(string.ascii_uppercase + string.digits + string.ascii_lowercase)
        for _ in range(10)
    )
    listen_key = "".join(
        random.choice(string.ascii_uppercase + string.digits + string.ascii_lowercase)
        for _ in range(10)
    )
    if reuse:
        await cursor.update(
            "DELETE FROM r4_api_keys WHERE api_key = %s AND user_id = 1", (reuse,)
        )
    await cursor.update(
        "INSERT INTO r4_api_keys (user_id, api_key, api_expiry, api_key_listen_key) VALUES (%s, %s, %s, %s)",
        (user_id, api_key, expiry, listen_key),
    )
    return api_key


async def ensure_api_key(cursor: RainwaveCursor, user_id: int) -> str:
    api_key = await cursor.fetch_var(
        "SELECT api_key FROM r4_api_keys WHERE user_id = %s",
        (user_id,),
        var_type=str,
    )
    if not api_key:
        return await generate_api_key(cursor, user_id)

    return api_key
