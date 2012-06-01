import time

from rainwave import event
from libs import db
from libs import constants
from libs import config
from libs import cache

# Events for each station
current = {}
next = {}
history = {}

class ScheduleIsEmpty(Exception):
	pass

def load():
	for sid in constants.station_ids:
		current[sid] = cache.get_station_var(sid, "sched_current")
		# If our cache is empty, pull from the DB
		if not current[sid]:
			try:
				current[sid] = get_event_in_progress(sid)
			except ElectionDoesNotExist:
				current[sid] = event.Election(sid)
		if not current[sid]:
			raise ScheduleIsEmpty("Could not load or create any election for a current event.")
			
		next[sid] = cache.get_station_var(sid, "sched_next")
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
		
		history[sid] = cache.get_station_var(sid, "sched_history")
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
	at_time = db.c.fetch_row("SELECT sched_id, sched_type FROM r4_schedule WHERE sid = %s AND sched_start <= %s AND sched_end > %s ORDER BY (%s - sched_start) LIMIT 1", (sid, epoch_time, epoch_time))
	if at_time:
		return event.load_by_id_and_type(at_time['sched_id'], at_time['sched_type'])
	elif epoch_time >= time.time():
		return None
	else:
		# We add 5 seconds here in order to make up for any crossfading and buffering times that can screw up the radio timing
		elec_id = db.c.fetch_var("SELECT elec_id FROM r4_elections WHERE r4_elections.sid = %s AND elec_played_at <= %s ORDER BY elec_played_at DESC LIMIT 1", (sid, epoch_time - 5))
		if elec_id:
			return event.Election.load_by_id(load_by_id_and_type(at_time['sched_id'], at_time['sched_type'])
		else:
			return None

def get_current_file(sid):
	return current[sid].get_filename()

def advance_station(sid):
	current[sid].finish()
	history.insert(0, current[sid].get_song())
	current[sid] = next[0]
	# TODO: Load next unused election if length(next) < 2
	current[sid].start()
	_trim()
	_update_memcache()

def _trim():
	pass
	
def _update_memcache():
	pass
	
