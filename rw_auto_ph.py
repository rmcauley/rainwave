#!/usr/bin/python

import argparse
import time
import math
import sys
from datetime import datetime, timedelta
from pytz import timezone

from libs import config
from libs import db
from libs import cache
from libs import log

from rainwave.events import oneup

TARGET_SID = 5
TARGET_LENGTH = 120 * 60
MIN_LENGTH = 20 * 60
SONGS_ADDED_SINCE_WHEN = 86400

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave Power Hour generation script.")
	parser.add_argument("--config", default=None)
	args = parser.parse_args()
	config.load(args.config)
	log_file = "%s/rw_auto_ph.log" % (config.get_directory("log_dir"),)
	log.init(log_file, config.get("log_level"))
	db.connect()
	cache.connect()

	songs_today = db.c.fetch_all(
		"SELECT r4_songs.song_id, r4_songs.song_length "
		"FROM r4_song_sid "
			"JOIN r4_songs ON (r4_song_sid.song_id = r4_songs.song_id) "
		"WHERE song_added_on > %s "
			"AND song_verified = TRUE "
			"AND sid = %s "
			"AND song_origin_sid != 2 "        # no ocremix per request of jf
		"ORDER BY random() ",
		(long(time.time() - SONGS_ADDED_SINCE_WHEN), TARGET_SID)
	)

	if len(songs_today) > 0:
		total_seconds = 0
		for song_row in songs_today:
			total_seconds = total_seconds + song_row['song_length']

		if total_seconds < MIN_LENGTH:
			log.debug("auto_ph", "Added songs do not add up to enough time to make a Power Hour")
			sys.exit(0)

		number_of_ph = int(math.ceil(float(total_seconds) / float(TARGET_LENGTH)))
		length_of_each_ph = total_seconds / number_of_ph

		log.debug("auto_ph", "Total minutes    : %s" % (total_seconds / 60))
		log.debug("auto_ph", "Number of PH:    : %s" % number_of_ph)
		log.debug("auto_ph", "Length of each PH: %s" % (length_of_each_ph / 60))

		original_start = start = datetime.now(timezone('US/Eastern')).replace(hour=14, minute=0, second=0, microsecond=0)

		delta_days = 0
		for ph_num in range(number_of_ph):
			start = datetime.now(timezone('US/Eastern')).replace(hour=14, minute=0, second=0, microsecond=0) + timedelta(days=delta_days)
			start_epoch = long((start - datetime.fromtimestamp(0, timezone('US/Eastern'))).total_seconds())

			name = original_start.strftime("%b %d New Music")
			if number_of_ph > 1:
				name += ' (Part %s)' % (delta_days + 1)

			p = oneup.OneUpProducer.create(
				sid=TARGET_SID,
				start=start_epoch,
				end=start_epoch + 1,
				name=name
			)

			length = 0
			while length < length_of_each_ph and len(songs_today):
				song_row = songs_today.pop()
				p.add_song_id(song_row['song_id'], TARGET_SID)
				length += song_row['song_length']
				if length > TARGET_LENGTH:
					break

			p.shuffle_songs()
			p.load_all_songs()

			start_eu = datetime.now(timezone('Europe/London')).replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=delta_days + 1)
			start_epoch_eu = long((start_eu - datetime.fromtimestamp(0, timezone('US/Eastern'))).total_seconds())
			p_eu = oneup.OneUpProducer.create(
				sid=TARGET_SID,
				start=start_epoch_eu,
				end=start_epoch_eu + 1,
				name=original_start.strftime("%b %d New Music Reprisal")
			)
			for song in p.songs:
				p_eu.add_song_id(song.id, TARGET_SID)

			length_human = "%s:%02u" % (int(math.floor(length / 60)), (length % 60))
			log.debug("auto_ph", "PH %s, %s new songs, %s length, %s day(s) in the future." % (delta_days, len(p.songs), length_human, delta_days))

			delta_days += 1
	else:
		log.debug("auto_ph", "No new songs.")
