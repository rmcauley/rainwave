#!/usr/bin/python

import argparse
import time
import math
from datetime import datetime, timedelta
from pytz import timezone

from libs import config
from libs import db
from libs import cache
from libs import log

from rainwave.events import oneup

TARGET_SID = 5
TARGET_LENGTH = 120 * 60

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave Power Hour generation script.")
	parser.add_argument("--config", default=None)
	args = parser.parse_args()
	config.load(args.config)
	log_file = "%s/rw_auto_ph.log" % (config.get_directory("log_dir"),)
	log.init(log_file, config.get("log_level"))
	db.connect()
	cache.connect()

	songs_today = db.c.fetch_list("SELECT r4_songs.song_id FROM r4_song_sid JOIN r4_songs ON (r4_song_sid.song_id = r4_songs.song_id) WHERE song_added_on > %s AND song_verified = TRUE AND sid = %s ORDER BY random()", (long(time.time() - 86400), TARGET_SID))
	if len(songs_today) > 0:
		start = datetime.now(timezone('US/Eastern')).replace(hour=13, minute=0, second=0, microsecond=0)
		start_epoch = long((start - datetime.fromtimestamp(0, timezone('US/Eastern'))).total_seconds())
		p = oneup.OneUpProducer.create(
			sid=TARGET_SID,
			start=start_epoch,
			end=start_epoch + 1,
			name=start.strftime("%b %d New Music")
		)
		length = 0
		for song_id in songs_today:
			p.add_song_id(song_id, TARGET_SID)
			length = p.end - p.start
			if length > TARGET_LENGTH:
				break
		p.shuffle_songs()
		p.load_all_songs()

		start_eu = datetime.now(timezone('Europe/London')).replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=1)
		start_epoch_eu = long((start_eu - datetime.fromtimestamp(0, timezone('US/Eastern'))).total_seconds())
		p_eu = oneup.OneUpProducer.create(
			sid=TARGET_SID,
			start=start_epoch_eu,
			end=start_epoch_eu + 1,
			name=start.strftime("%b %d New Music Reprisal")
		)
		for song in p.songs:
			p_eu.add_song_id(song.id, TARGET_SID)

		length_human = "%s:%02u" % (int(math.floor(length / 60)), (length % 60))
		log.debug("auto_ph", "%s new songs, %s length." % (len(songs_today), length_human))
	else:
		log.debug("auto_ph", "No new songs.")
