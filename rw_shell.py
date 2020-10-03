#!/usr/bin/env python

from traitlets.config import Config

import IPython

from libs import db
from libs import cache
from libs import config
from libs import log

config.load()
cache.connect()
log.init()
db.connect()

c = Config()
c.InteractiveShellApp.exec_lines = [
    "from libs import db",
    "from libs import cache",
    "from libs import config",
    "from rainwave.events.election import Election, ElectionProducer",
    "from rainwave.events.oneup import OneUp, OneUpProducer",
    "from rainwave.playlist_objects.album import Album",
    "from rainwave.playlist_objects.artist import Artist",
    "from rainwave.playlist_objects.song import Song",
    "from rainwave.playlist_objects.songgroup import SongGroup",
    "from rainwave.user import User",
]
c.TerminalIPythonApp.display_banner = False

IPython.start_ipython(config=c)
