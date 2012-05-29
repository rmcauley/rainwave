import time

from rainwave import event
from libs import db
from libs import constants
from libs import config

# Events for each station
current = {}
next = {}
history = {}

def load():
	for sid in constants.station_ids:
		current[sid] = get_event_in_progress(sid)
		future_time = time.time() + current[sid].get_length()
		next_event = True
		next[sid] = []
		while len(next) < 2 and next_event:
			next_event = get_event_at_time(sid, future_time)
			if next_event:
				future_time += next_event.get_length()
				next.append(next_event)
		past_event = True
		past_time = current[sid].start_actual
		past[sid] = []
		while len(history) < 3 and past_event:
			past_event = get_event_at_time(sid, past_time)
			if past_event:
				past_time -= past_event.get_length()
				past.append(past_event)
		
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
		return event.Election.load_by_type(event.ElectionTypes.normal)
	else:
		# We add 5 seconds here in order to make up for any crossfading and buffering times that can screw up the radio timing
		at_time = db.c.fetch_row("SELECT r4_elections.sched_id, sched_type FROM r4_elections JOIN r4_schedule USING (sched_id) WHERE r4_elections.sid = %s AND elec_played_at <= %s ORDER BY elec_played_at DESC LIMIT 1", (sid, epoch_time - 5))
		if at_time:
			return event.load_by_id_and_type(at_time['sched_id'], at_time['sched_type'])
		else:
			return None

def get_current_file(sid):
	return current.get_file()

def advance_station(sid):
	pass
	
# Not to be called by outside - should be called in advance_station
def _create_elections(sid):
	pass

def _trim():
	pass
	
def _update_memcache():
	pass
	
