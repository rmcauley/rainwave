import tornado.ioloop
from time import time as timestamp
from common.libs import db
from libs import log


def api_key_pruning() -> None:
    number_deleted = await cursor.update(
        "DELETE FROM r4_api_keys WHERE user_id <= 1 AND api_expiry < %s", (timestamp(),)
    )
    log.debug("key_prune", "%s API keys pruned." % number_deleted)


key_pruning = tornado.ioloop.PeriodicCallback(api_key_pruning, 3600000)
key_pruning.start()
