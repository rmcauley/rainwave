#!/usr/bin/env python

from traitlets.config import Config

import IPython

from backend.libs import db
from libs import cache
from libs import config
from libs import log

config.load()
cache.connect()
log.init()
db.connect()

c = Config()
c.InteractiveShellApp.exec_lines = [
    "from backend.libs import db",
    "from libs import cache",
    "from libs import config",
    "from backend.rainwave.events.election import Election, ElectionProducer",
    "from backend.rainwave.events.oneup import OneUp, OneUpProducer",
    "from backend.rainwave.playlist_objects.album import Album",
    "from backend.rainwave.playlist_objects.artist import Artist",
    "from backend.rainwave.playlist_objects.song import Song",
    "from backend.rainwave.playlist_objects.songgroup import SongGroup",
    "from backend.rainwave.user import User",
]
c.TerminalIPythonApp.display_banner = False

IPython.start_ipython(config=c)
