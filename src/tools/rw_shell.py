#!/usr/bin/env python

from traitlets.config import Config

import IPython

from src.backend.libs import db
from libs import cache
from libs import config
from libs import log

config.load()
cache.connect()
log.init()
db.connect()

c = Config()
c.InteractiveShellApp.exec_lines = [
    "from src.backend.libs import db",
    "from libs import cache",
    "from libs import config",
    "from src.backend.rainwave.events.election import Election, ElectionProducer",
    "from src.backend.rainwave.events.oneup import OneUp, OneUpProducer",
    "from src.backend.rainwave.playlist_objects.album import Album",
    "from src.backend.rainwave.playlist_objects.artist import Artist",
    "from src.backend.rainwave.playlist_objects.song import Song",
    "from src.backend.rainwave.playlist_objects.songgroup import SongGroup",
    "from src.backend.rainwave.user import User",
]
c.TerminalIPythonApp.display_banner = False

IPython.start_ipython(config=c)
