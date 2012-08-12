import time

from backend import sync_to_front
from rainwave import event
from rainwave import playlist
from rainwave import listeners
from rainwave import request
from rainwave import user
from libs import db
from libs import config
from libs import cache

# Events for each station
current = {}
next = {}
history = {}

class ScheduleIsEmpty(Exception):
	pass

def load():
	for sid in config.station_ids:
		current[sid] = cache.get_station(sid, "sched_current")
		# If our cache is empty, pull from the DB
		if not current[sid]:
			try:
				current[sid] = get_event_in_progress(sid)
			except event.ElectionDoesNotExist:
				current[sid] = event.Election(sid)
		if not current[sid]:
			raise ScheduleIsEmpty("Could not load or create any election for a current event.")
			
		next[sid] = cache.get_station(sid, "sched_next")
		if not next[sid]:
			future_time = time.time() + current[sid].get_length()
			next_elecs = event.Election.load_unused(sid)
			next_event = True
			next[sid] = []
			while len(next) < 2 and next_event:
				next_event = get_event_at_time(sid, future_time)
				if not next_event:
					if length(next_elecs) > 0:
						next_event = next_elecs.pop(0)
					else:
						next_event = event.Election.create(sid)
				if next_event:
					future_time += next_event.get_length()
					next.append(next_event)
		
		history[sid] = cache.get_station(sid, "sched_history")
		if not history[sid]:
			history[sid] = []
			song_ids = db.c.fetch_list("SELECT song_id FROM r4_song_history WHERE sid = %s ORDER BY songhist_id DESC")
			for id in song_ids:
				history[sid].append(playlist.Song.load_by_id(id, sid))
		
def get_event_in_progress(sid):
	in_progress = db.c.fetch_row("SELECT sched_id, sched_type FROM r4_schedule WHERE sid = %s AND sched_in_progress = TRUE ORDER BY sched_start DESC LIMIT 1", (sid,))
	if in_progress:
		return event.load_by_id_and_type(in_progress['sched_id'], in_progress['sched_type'])
	else:
		return get_event_at_time(sid, time.time())
		
def get_event_at_time(sid, epoch_time):
	at_time = db.c.fetch_row("SELECT sched_id, sched_type FROM r4_schedule WHERE sid = %s AND sched_start <= %s AND sched_end > %s ORDER BY (%s - sched_start) LIMIT 1", (sid, epoch_time - 5, epoch_time, epoch_time))
	if at_time:
		return event.load_by_id_and_type(at_time['sched_id'], at_time['sched_type'])
	elif epoch_time >= time.time():
		return None
	else:
		# We add 5 seconds here in order to make up for any crossfading and buffering times that can screw up the radio timing
		elec_id = db.c.fetch_var("SELECT elec_id FROM r4_elections WHERE r4_elections.sid = %s AND elec_start_actual <= %s ORDER BY elec_start_actual DESC LIMIT 1", (sid, epoch_time - 5))
		if elec_id:
			return event.Election.load_by_id(load_by_id_and_type(at_time['sched_id'], at_time['sched_type']))
		else:
			return None

def get_current_file(sid):
	return current[sid].get_filename()

def advance_station(sid):
	playlist.prepare_cooldown_algorithm(sid)
	playlist.clear_updated_albums(sid)
	
	# TODO LATER: Make sure we can "pause" the station here to handle DJ interruptions
	# Requires controlling the streamer itself to some degree and will take more
	# work on the API than the back-end.

	current[sid].finish()
	
	last_song = current[sid].get_song()
	history.insert(0, last_song)
	db.c.update("INSERT INTO r4_song_history (sid, song_id) VALUES (%s, %s)", (sid, last_song.id))
	
	integrate_new_events(sid)
	sort_next(sid)
	current[sid] = next.pop(0)
	current[sid].start_event()

def post_process(sid):
	_create_elections(sid)
	_update_memcache(sid)
	
	if not config.test_mode:
		sync_to_front.sync_frontend_all(sid)
		
	_add_listener_count_record(sid)
	cache.update_user_rating_acl(sid, current[sid].get_song().id)
	_trim(sid)
	user.trim_listeners(sid)
	
def _add_listener_count_record(sid):
	lc_guests = db.c.fetch_var("SELECT COUNT(*) FROM r4_listeners WHERE sid = %s AND listener_purge = FALSE AND user_id = 1", (sid,))
	lc_users = db.c.fetch_var("SELECT COUNT(*) FROM r4_listeners WHERE sid = %s AND listener_purge = FALSE AND user_id > 1", (sid,))
	lc_guests_active = db.c.fetch_var("SELECT COUNT(*) FROM r4_listeners WHERE sid = %s AND listener_purge = FALSE AND user_id = 1 AND listener_voted_entry IS NOT NULL", (sid,))
	lc_users_active = db.c.fetch_var("SELECT COUNT(*) FROM r4_listeners WHERE sid = %s AND listener_purge = FALSE AND user_id > 1 AND listener_voted_entry IS NOT NULL", (sid,))
	return db.c.update("INSERT INTO r4_listener_counts (sid, lc_guests, lc_users, lc_guests_active, lc_users_active) VALUES (%s, %s, %s, %s, %s)", (sid, lc_guests, lc_users, lc_guests_active, lc_users_active))
	
def integrate_new_events(sid):
	max_sched_id = 0
	max_elec_id = 0
	num_elections = 0
	for event in next[sid]:
		if event.is_election:
			num_elections += 1
			if event.id > max_elec_id:
				max_elec_id = event.id
		elif not event.is_election and event.id > max_sched_id:
			max_sched_id = event.id
	unused_sched_id = db.c.fetch_list("SELECT sched_id FROM r4_schedule WHERE sid = %s AND sched_id > %s AND sched_used = FALSE AND sched_start <= %s ORDER BY sched_start", (sid, max_sched_id, time.time() + 86400))
	for sched_id in unused_sched_id:
		next[sid].append(event.load_by_id(sched_id))
		
	# Step 4: Insert "priority elections" ahead of anything else
	priority_elec_ids = db.c.fetch_list("SELECT elec_id FROM r4_elections WHERE sid = %s AND elec_id > %s AND elec_priority = TRUE ORDER BY elec_id DESC", (sid, max_elec_id))
	for elec_id in priority_elec_ids:
		event = playlist.Election.load_by_id(elec_id)
		# The client, through the API, sets start times, so we don't have to worry about where in the array it goes.  The sorter will take care of it.
		next[sid].append(event)
		if event.id > max_elec_id:
			max_elec_id = event.id
		num_elections += 1
		event.set_priority(False)
		
	return (max_sched_id, max_elec_id, num_elections)

def sort_next(sid):
	next[sid] = sorted(next[sid], key=lambda event: event.start_time)
	
def _create_elections(sid):
	# Step, er, 0: Update the request cache first, so elections have the most recent data to work with
	# (the entire requests module depends on its caches)
	request.update_cache(sid)

	max_sched_id, max_elec_id, num_elections = integrate_new_events(sid)
	
	# Step 2: Load up any elections that have been added while we've been idle (i.e. by admins) and append them to the list
	unused_elec_id = db.c.fetch_list("SELECT elec_id FROM r4_elections WHERE sid = %s AND elec_id > %s AND elec_priority = FALSE ORDER BY elec_id", (sid, max_elec_id))
	unused_elecs = []
	num_elections += length(unused_elec_id)
	for elec_id in unused_elec_id:
		unused_elecs.append(event.Election.load_by_id(elec_id))
	
	# Step 3a: Sort the next list (that excludes any added elections)
	sort_next(sid)
	# Step 3b: Insert elections where there's time and adjust predicted start times as necessary, if num_elections < 2 then create them where necessary
	i = 1
	running_time = current[sid].start_actual + current[sid].length()
	next[0].start = running_time
	while i < length(next[sid]):
		next_start = next[i].start
		gap = next_start - running_time
		next_elec_i = None
		next_elec_length = playlist.avg_song_length
		j = i
		while j < length(next[sid]):
			if next[j].is_election:
				next_elec = j
				next_elec_length = next[j].length()
				break
		if not next_elec_i and length(unused_elecs) > 0:
			next_elec_length = unused_elecs[0].length()

		# TODO: This algorithm DEFINITELY needs code/concept review
		# There are potential holes - it is not as comprehensive a scheduler as the previous
		# Rainwave scheduler, however it is vastly simplified.
		# One drawback is that you cannot schedule elections themselves to run at certain times.
		
		create_elecs = False
		# If the event we're looking at collides with the previous event, adjust this event to start later
		if gap <= 0:
			next[sid][i].start = running_time
			running_time += next[sid][i].length()
		# If we have no elections current in the next list and there's enough time to fit a song, stuff an election in
		# (this automatically takes into account unused elections, based on next_elec_length definition above)
		elif not next_elec_i and gap <= (next_elec_length * 1.4):
			next_elec = None
			# If we have an existing unused election, we can use that (as next_elec_length is already based on the first unused elec, this can happen)
			if length(unused_elecs) > 0:
				next_elec = unused_elecs.pop(0)
			# If not, create a new election timed to the gap (next_elec_length will be the average song length*1.4, so this will happen frequently)
			else:
				next_elec = _create_election(sid, running_time, gap)
			num_elections += 1
			next_elec.start = running_time
			running_time += next_elec.length()
			next[sid].insert(i, next_elec)
		# If it's more accurate to squeeze a created election in here than adjust the next event, move the event
		# *OR* the next event is too far out and we have elections in hand
		elif next_elec_i and ((gap <= (next_elec_length / 2)) or (gap > (next_elec_length * 1.5))):
			next_elec = next[sid].pop(next_elec_i)
			next_elec.start = running_time
			running_time += next_elec.length()
			next[sid].insert(i, next_elec)
		# The next event is better off aligned
		else:
			next[sid][i].start = running_time
			running_time += next[sid][i].length()
		i += 1
	
	# Step 5: If we're at less than 2 elections available, create them and append them
	# No timing is required here, since we're simply outright appending to the end
	# (any elections appearing before a scheduled item would be handled by the block above)
	for i in range(num_elections, config.get("num_planned_elections")):
		next_elec = _create_election(sid, running_time)
		next_elec.start = running_time
		running_time += next_elec.length()
		next[sid].append(next_elec)
	
def _create_election(sid, start_time = None, target_length = None):
	# Check to see if there are any events during this time
	elec_scheduler = get_event_at_time(start_time)
	# If there are, and it makes elections (e.g. PVP Hours), get it from there
	if elec_scheduler and elec_scheduler.produces_elections:
		elec_scheduler.create_election(sid)
	else:
		elec = Event.Election.create(sid)
	elec.fill(target_length)
	return elec

def _trim(sid):
	# Deletes any events in the schedule and elections tables that are old, according to the config
	db.c.update("DELETE FROM r4_schedule WHERE sched_start_actual <= %s", (time.time() - config.get("trim_event_age")))
	db.c.update("DELETE FROM r4_elections WHERE elec_start_actual <= %s", (time.time() - config.get("trim_election_age")))
	max_history_id = db.c.fetch_var("SELECT MAX(songhist_id) FROM r4_song_history")
	db.c.update("DELETE FROM r4_song_history WHERE songhist_id <= %s", (max_history_id - config.get("trim_history_length")))
	
def _update_memcache(sid):
	cache.set_station(sid, "sched_current", current[sid])
	cache.set_station(sid, "sched_next", next[sid])
	cache.set_station(sid, "sched_history", history[sid])
	cache.prime_rating_cache_for_events([ sched_current[sid] ] + sched_next[sid] + sched_history[sid])	
	cache.set_station(sid, "current_listeners", listeners.get_listeners_dict())
	cache.set_station(sid, "album_diff", playlist.get_updated_albums_dict(sid))