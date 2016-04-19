import time
from time import time as timestamp
import tornado.ioloop
import datetime
import requests

from backend import sync_to_front
from rainwave import events
from rainwave import playlist
import rainwave.playlist_objects.album
from rainwave import listeners
from rainwave import request
from rainwave import user
from libs import db
from libs import config
from libs import cache
from libs import log

from rainwave.events import election

# This is to make sure the code gets loaded and producers get registered
import rainwave.events.oneup
import rainwave.events.pvpelection
import rainwave.events.shortest_election
import rainwave.events.singlesong

# Events for each station
current = {}
upnext = {}
history = {}

class ScheduleIsEmpty(Exception):
	pass

def load():
	for sid in config.station_ids:
		current[sid] = cache.get_station(sid, "sched_current")
		# If our cache is empty, pull from the DB
		if not current[sid]:
			current[sid] = get_event_in_progress(sid)
		if not current[sid]:
			raise Exception("Could not load any events!")

		upnext[sid] = cache.get_station(sid, "sched_next")
		if not upnext[sid]:
			upnext[sid] = []
			manage_next(sid)

		history[sid] = cache.get_station(sid, "sched_history")
		if not history[sid]:
			history[sid] = []
			for song_id in db.c.fetch_list("SELECT song_id FROM r4_song_history JOIN r4_song_sid USING (song_id, sid) JOIN r4_songs USING (song_id) WHERE sid = %s AND song_exists = TRUE AND song_verified = TRUE ORDER BY songhist_time DESC LIMIT 5", (sid,)):
				history[sid].insert(0, events.singlesong.SingleSong(song_id, sid))
			# create a fake history in case clients expect it without checking
			if not len(history[sid]):
				for i in range(1, 5):
					history[sid].insert(0, events.singlesong.SingleSong(playlist.get_random_song_ignore_all(sid), sid))

def get_event_in_progress(sid):
	producer = get_current_producer(sid)
	evt = producer.load_event_in_progress()
	if not evt or not evt.songs or not len(evt.songs):
		producer = election.ElectionProducer(sid)
		evt = producer.load_event_in_progress()
	return evt

def get_current_producer(sid):
	return get_producer_at_time(sid, int(timestamp()))

def get_producer_at_time(sid, at_time):
	to_ret = None
	local_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(at_time))
	time_ahead = int((at_time - timestamp()) / 60)
	sched_id = db.c.fetch_var(	"SELECT sched_id "
								"FROM r4_schedule "
								"WHERE sid = %s AND sched_start <= %s AND sched_end > %s "
								"ORDER BY sched_id DESC "
								"LIMIT 1", (sid, at_time + 20, at_time))
	try:
		to_ret = events.event.BaseProducer.load_producer_by_id(sched_id)
		if to_ret:
			to_ret.start_producer()
	except Exception as e:
		log.warn("get_producer", "Failed to obtain producer at time %s (%sm ahead)." % (local_time, time_ahead))
		log.exception("get_producer", "Failed to get an appropriate producer at time %s  (%sm ahead)." % (local_time, time_ahead), e)
	if not to_ret:
		log.debug("get_producer", "No producer at time %s  (%sm ahead), defaulting to election." % (local_time, time_ahead))
		return election.ElectionProducer(sid)
	if not to_ret.has_next_event():
		log.warn("get_producer", "Producer ID %s (type %s, %s) has no events." % (to_ret.id, to_ret.type, to_ret.name))
		return election.ElectionProducer(sid)
	return to_ret

def get_advancing_file(sid):
	return upnext[sid][0].get_filename()

def get_advancing_event(sid):
	return upnext[sid][0]

def get_current_file(sid):
	return current[sid].get_filename()

def get_current_event(sid):
	return current[sid]

def set_upnext_crossfade(sid, crossfade):
	if sid in upnext and upnext[sid][0]:
		upnext[sid][0].use_crossfade = crossfade

def advance_station(sid):
	db.c.start_transaction()
	try:
		log.debug("advance", "Advancing station %s." % sid)
		start_time = timestamp()
		# If we need some emergency elections here
		if len(upnext[sid]) == 0:
			manage_next(sid)

		while upnext[sid][0].used or len(upnext[sid][0].songs) == 0:
			log.warn("advance", "Event ID %s was already used or has zero songs.  Deleting." % upnext[sid][0].id)
			upnext[sid][0].delete()
			upnext[sid].pop(0)
			if len(upnext[sid]) == 0:
				manage_next(sid)

		start_time = timestamp()
		upnext[sid][0].prepare_event()
		db.c.commit()

		log.debug("advance", "upnext[0] preparation time: %.6f" % (timestamp() - start_time,))
		log.info("advance", "Next song: %s" % get_advancing_file(sid))

		tornado.ioloop.IOLoop.instance().add_timeout(datetime.timedelta(milliseconds=150), lambda: post_process(sid))
	except:
		db.c.rollback()
		raise

def post_process(sid):
	try:
		db.c.start_transaction()
		start_time = timestamp()
		playlist.prepare_cooldown_algorithm(sid)
		rainwave.playlist_objects.album.clear_updated_albums(sid)
		log.debug("post", "Playlist prepare time: %.6f" % (timestamp() - start_time,))

		start_time = timestamp()
		current[sid].finish()
		for sched_id in db.c.fetch_list("SELECT sched_id FROM r4_schedule WHERE sched_end < %s AND sched_used = FALSE", (timestamp(),)):
			t_evt = events.event.BaseProducer.load_producer_by_id(sched_id)
			t_evt.finish()
		log.debug("post", "Current finish time: %.6f" % (timestamp() - start_time,))

		start_time = timestamp()
		last_song = current[sid].get_song()
		if last_song:
			db.c.update("INSERT INTO r4_song_history (sid, song_id) VALUES (%s, %s)", (sid, last_song.id))
		log.debug("post", "Last song insertion time: %s" % (timestamp() - start_time,))

		start_time = timestamp()
		history[sid].insert(0, current[sid])
		while len(history[sid]) > 5:
			history[sid].pop()
		log.debug("post", "History management: %.6f" % (timestamp() - start_time,))

		start_time = timestamp()
		current[sid] = upnext[sid].pop(0)
		current[sid].start_event()
		log.debug("advance", "Current management: %.6f" % (timestamp() - start_time,))

		start_time = timestamp()
		playlist.warm_cooled_songs(sid)
		playlist.warm_cooled_albums(sid)
		log.debug("advance", "Cooldown warming: %.6f" % (timestamp() - start_time,))

		start_time = timestamp()
		_add_listener_count_record(sid)
		_trim(sid)
		user.trim_listeners(sid)
		cache.update_user_rating_acl(sid, history[sid][0].get_song().id)
		user.unlock_listeners(sid)
		db.c.update("UPDATE r4_listeners SET listener_voted_entry = NULL WHERE sid = %s", (sid,))
		log.debug("advance", "User management and trimming: %.6f" % (timestamp() - start_time,))

		start_time = timestamp()
		# reduce song blocks has to come first, otherwise it wll reduce blocks generated by _create_elections
		playlist.reduce_song_blocks(sid)
		# update_cache updates both the line and expiry times
		# this is expensive and must be done before and after every request is filled
		# DO THIS AFTER EVERYTHING ELSE, RIGHT BEFORE NEXT MANAGEMENT, OR PEOPLE'S REQUESTS SLIP THROUGH THE CRACKS
		request.update_line(sid)
		# add to the event list / update start times for events
		manage_next(sid)
		# update expire times AFTER manage_next, so people who aren't in line anymore don't see expiry times
		request.update_expire_times()
		log.debug("advance", "Request and upnext management: %.6f" % (timestamp() - start_time,))

		update_memcache(sid)

		sync_to_front.sync_frontend_all(sid)
		db.c.commit()
	except:
		db.c.rollback()
		raise

	if current[sid] and config.has_station(sid, "tunein_partner_key") and config.get_station(sid, "tunein_partner_key"):
		ti_song = current[sid].get_song()
		if ti_song:
			ti_title = ti_song.data['title']
			ti_album = ti_song.albums[0].data['name']
			ti_artist = ', '.join([ a.data['name'] for a in ti_song.artists ])

			params = { "id": config.get_station(sid, "tunein_id"),
						"title": ti_title, "artist": ti_artist, "album": ti_album }

			try:
				req = requests.Request("GET", "http://air.radiotime.com/Playing.ashx", params=params)
				p = req.prepare()
				# Must be done here rather than in params because of odd strings TuneIn creates
				p.url += "&partnerId=%s" % config.get_station(sid, "tunein_partner_id")
				p.url += "&partnerKey=%s" % config.get_station(sid, "tunein_partner_key")
				s = requests.Session()
				resp = s.send(p, timeout=3)
				log.debug("advance", "TuneIn updated (%s): %s" % (resp.status_code, resp.text))
			except Exception as e:
				log.exception("advance", "Could not update TuneIn.", e)

# def refresh_schedule(sid):
# 	integrate_new_events(sid)
# 	sort_next(sid)
# 	update_memcache(sid)
# 	sync_to_front.sync_frontend_all_timed(sid)

def _add_listener_count_record(sid):
	# THIS FUNCTION IS BROKEN BECAUSE ACCURATE LISTENER TRACKING DOES NOT HAPPEN
	#
	# the listener_counts table is now being used differently, please check backend/icecast_sync.py
	# for how it's used now
	#
	# lc_guests = db.c.fetch_var("SELECT COUNT(*) FROM r4_listeners WHERE sid = %s AND listener_purge = FALSE AND user_id = 1", (sid,))
	# lc_users = db.c.fetch_var("SELECT COUNT(*) FROM r4_listeners WHERE sid = %s AND listener_purge = FALSE AND user_id > 1", (sid,))
	# lc_guests_active = db.c.fetch_var("SELECT COUNT(*) FROM r4_listeners WHERE sid = %s AND listener_purge = FALSE AND user_id = 1 AND listener_voted_entry IS NOT NULL", (sid,))
	# lc_users_active = db.c.fetch_var("SELECT COUNT(*) FROM r4_listeners WHERE sid = %s AND listener_purge = FALSE AND user_id > 1 AND listener_voted_entry IS NOT NULL", (sid,))
	# return db.c.update("INSERT INTO r4_listener_counts (sid, lc_guests, lc_users, lc_guests_active, lc_users_active) VALUES (%s, %s, %s, %s, %s)", (sid, lc_guests, lc_users, lc_guests_active, lc_users_active))
	pass

def _get_schedule_stats(sid):
	global upnext
	global current

	max_sched_id = 0
	max_elec_id = None
	end_time = int(timestamp())
	if sid in current and current[sid]:
		max_sched_id = current[sid].id
		if current[sid].start_actual:
			end_time = current[sid].start_actual + current[sid].length()
		else:
			end_time += current[sid].length()
		if current[sid].is_election:
			max_elec_id = current[sid].id
	num_elections = 0

	if sid in upnext:
		for e in upnext[sid]:
			if e.is_election:
				num_elections += 1
				if e.id > max_elec_id:
					max_elec_id = e.id
			elif not e.is_election and e.id > max_sched_id:
				max_sched_id = e.id
			end_time += e.length()

	if not max_elec_id:
		max_elec_id = db.c.fetch_var("SELECT elec_id FROM r4_elections WHERE elec_used = TRUE ORDER BY elec_id DESC LIMIT 1")

	return (max_sched_id, max_elec_id, num_elections, end_time)

def manage_next(sid):
	#pylint: disable=W0612
	max_sched_id, max_elec_id, num_elections, max_future_time = _get_schedule_stats(sid)
	#pylint: enable=W0612
	now_producer = get_producer_at_time(sid, timestamp())
	next_producer = get_producer_at_time(sid, max_future_time)
	nextnext_producer_start = db.c.fetch_var("SELECT sched_start FROM r4_schedule WHERE sid = %s AND sched_used = FALSE AND sched_start > %s AND sched_timed = TRUE", (sid, max_future_time))
	time_to_future_producer = None
	if nextnext_producer_start:
		time_to_future_producer = nextnext_producer_start - max_future_time
	else:
		time_to_future_producer = 86400
	while len(upnext[sid]) < min(now_producer.plan_ahead_limit, next_producer.plan_ahead_limit):
		target_length = None
		if time < 20:
			log.debug("timing", "SID %s <20 seconds to upnext event, not using timing." % sid)
		if time_to_future_producer < 40:
			target_length = time_to_future_producer
			next_producer = rainwave.events.shortest_election.ShortestElectionProducer(sid)
			log.debug("timing", "SID %s <40 seconds to upnext event, using shortest elections." % sid)
		elif time_to_future_producer < (playlist.get_average_song_length(sid) * 1.3):
			target_length = time_to_future_producer
			log.debug("timing", "SID %s close to event, timing to %s seconds long." % (sid, target_length))
		elif time_to_future_producer < (playlist.get_average_song_length(sid) * 2.2):
			target_length = playlist.get_average_song_length(sid)
			log.debug("timing", "SID %s has an upcoming event, timing to %s seconds long." % (sid, target_length))
		next_event = next_producer.load_next_event(target_length, max_elec_id)
		if not next_event:
			log.info("manage_next", "Producer ID %s type %s did not produce an event." % (next_producer.id, next_producer.type))
			next_producer = election.ElectionProducer(sid)
			next_event = next_producer.load_next_event(target_length, max_elec_id)
		upnext[sid].append(next_event)
		if next_event.is_election:
			num_elections += 1
		if next_event.is_election and next_event.id > max_elec_id:
			max_elec_id = next_event.id
		max_future_time += upnext[sid][-1].length()
		time_to_future_producer -= upnext[sid][-1].length()
		next_producer = get_producer_at_time(sid, max_future_time)

	future_time = None
	if current[sid].start:
		future_time = current[sid].start + current[sid].length()
	else:
		future_time = int(timestamp() + current[sid].length())
	for evt in upnext[sid]:
		evt.start = future_time
		future_time += evt.length()
		if evt.is_election:
			evt.update_vote_counts()

def _get_or_create_election(sid, target_length = None):
	#pylint: disable=W0612
	max_sched_id, max_elec_id, num_elections, next_end_time = _get_schedule_stats(sid)
	#pylint: enable=W0612

	ep = election.ElectionProducer(sid)
	return ep.load_next_event(target_length=target_length, min_elec_id=max_elec_id)

def _trim(sid):
	# Deletes any events in the schedule and elections tables that are old, according to the config
	current_time = int(timestamp())
	db.c.update("DELETE FROM r4_schedule WHERE sched_start_actual <= %s", (current_time - config.get("trim_event_age"),))
	db.c.update("DELETE FROM r4_elections WHERE elec_start_actual <= %s", (current_time - config.get("trim_election_age"),))
	max_history_id = db.c.fetch_var("SELECT MAX(songhist_id) FROM r4_song_history")
	db.c.update("DELETE FROM r4_song_history WHERE songhist_id <= %s AND sid = %s", (max_history_id - config.get("trim_history_length"), sid))

def _update_schedule_memcache(sid):
	cache.set_station(sid, "sched_current", current[sid], True)
	cache.set_station(sid, "sched_next", upnext[sid], True)
	cache.set_station(sid, "sched_history", history[sid], True)

	sched_current_dict = current[sid].to_dict()
	cache.set_station(sid, "sched_current_dict", sched_current_dict, True)

	next_dict_list = []
	for event in upnext[sid]:
		next_dict_list.append(event.to_dict())
	cache.set_station(sid, "sched_next_dict", next_dict_list, True)

	history_dict_list = []
	for event in history[sid]:
		history_dict_list.append(event.to_dict())
	cache.set_station(sid, "sched_history_dict", history_dict_list, True)

	all_station = {}
	if 'songs' in sched_current_dict:
		all_station['title'] = sched_current_dict['songs'][0]['title']
		all_station['album'] = sched_current_dict['songs'][0]['albums'][0]['name']
		all_station['art'] = sched_current_dict['songs'][0]['albums'][0]['art']
	else:
		all_station['title'] = None
		all_station['album'] = None
		all_station['art'] = None
	all_station['event_name'] = sched_current_dict['name']
	all_station['event_type'] = sched_current_dict['type']
	cache.set_station(sid, "all_station_info", all_station, True)

def update_memcache(sid):
	_update_schedule_memcache(sid)
	update_live_voting(sid)
	cache.prime_rating_cache_for_events(sid, [ current[sid] ] + upnext[sid] + history[sid])
	cache.set_station(sid, "current_listeners", listeners.get_listeners_dict(sid), True)
	cache.set_station(sid, "album_diff", playlist.get_updated_albums_dict(sid), True)
	rainwave.playlist_objects.album.clear_updated_albums(sid)
	cache.set_station(sid, "all_albums", playlist.get_all_albums_list(sid), True)
	cache.set_station(sid, "all_artists", playlist.get_all_artists_list(sid), True)
	cache.set_station(sid, "all_groups", playlist.get_all_groups_list(sid), True)

	potential_dj_ids = []
	if getattr(current[sid], 'dj_user_id', None):
		potential_dj_ids.append(current[sid].dj_user_id)
	for evt in upnext[sid]:
		if getattr(evt, 'dj_user_id', None):
			potential_dj_ids.append(evt.dj_user_id)
	if len(history[sid]) and history[sid][-1] and getattr(history[sid][-1], 'dj_user_id', None):
		potential_dj_ids.append(history[sid][-1].dj_user_id)
	cache.set_station(sid, "dj_user_ids", potential_dj_ids)

def update_live_voting(sid):
	live_voting = {}
	upnext_sid = cache.get_station(sid, "sched_next")
	if not upnext_sid:
		return live_voting
	for event in upnext_sid:
		if event.is_election:
			live_voting[event.id] = db.c.fetch_all("SELECT entry_id, entry_votes, song_id FROM r4_election_entries WHERE elec_id = %s", (event.id,))
	cache.set_station(sid, "live_voting", live_voting)
	return live_voting

def get_elec_id_for_entry(sid, entry_id):
	for event in cache.get_station(sid, "sched_next"):
		if event.is_election and event.has_entry_id(entry_id):
			return event.id
	return 0
