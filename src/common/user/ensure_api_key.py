from common.db.cursor import RainwaveCursor
from common.user.api_key import generate_api_key_and_listen_key


async def ensure_api_key(cursor: RainwaveCursor, user_id: int) -> str:
    key = await cursor.fetch_var(
        "SELECT api_key FROM r4_api_keys WHERE user_id = %s LIMIT 1",
        (user_id,),
        var_type=str,
    )

    if not key:
        key, _listen_key = await generate_api_key_and_listen_key(cursor, user_id)

    return key
