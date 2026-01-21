#!/usr/bin/env python

from libs import db
from libs import cache
from libs import config
from libs import log

config.load()
cache.connect()
log.init()
db.connect()

db.c.update('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

db.c.update("ALTER TABLE phpbb_users ADD discord_user_id TEXT")
db.c.update("ALTER TABLE phpbb_users ADD radio_username TEXT")

db.c.update(
    " \
		CREATE TABLE r4_sessions( \
			session_id    UUID     PRIMARY KEY, \
			user_id       INTEGER  NOT NULL \
		)"
)
db.c.create_delete_fk("r4_sessions", "phpbb_users", "user_id")
