from time import time as timestamp

from common import log
from common.db.cursor import get_cursor


async def api_key_pruning() -> None:
    async with get_cursor() as cursor:
        number_deleted = await cursor.update(
            "DELETE FROM r4_api_keys WHERE user_id <= 1 AND api_expiry < %s",
            (timestamp(),),
        )
        log.debug("key_prune", "%s API keys pruned." % number_deleted)
