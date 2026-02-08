#!/usr/bin/env python

from common.libs import db
from libs import cache
from libs import config
from libs import log

config.load()
cache.connect()
log.init()
db.connect()

await cursor.update('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

await cursor.update("ALTER TABLE phpbb_users ADD discord_user_id TEXT")
await cursor.update("ALTER TABLE phpbb_users ADD radio_username TEXT")

await cursor.update(
    " \
		CREATE TABLE r4_sessions( \
			session_id    UUID     PRIMARY KEY, \
			user_id       INTEGER  NOT NULL \
		)"
)
await cursor.create_delete_fk("r4_sessions", "phpbb_users", "user_id")
