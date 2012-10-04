import unittest
from libs import db
from libs import cache
from rainwave import playlist
from rainwave import event
from rainwave.event import Election
from rainwave import user
from rainwave import request
from rainwave import schedule

def reset_schedule(sid):
	# Reset the schedule
	schedule.current = {}
	schedule.next = {}
	schedule.history = {}
	cache.set_station(sid, "sched_current", False)
	cache.set_station(sid, "sched_next", False)
	cache.set_station(sid, "sched_history", False)
	playlist.remove_all_locks(1)

class ScheduleTest(unittest.TestCase):
	def test_scheduler(self):
		# We need a completely blank slate for this
		db.c.update("DELETE FROM r4_schedule")
		db.c.update("DELETE FROM r4_elections")
		db.c.update("DELETE FROM r4_songs")
		
		# A hundred fake songs to fill our range out
		for i in range(0, 100):
			playlist.Song.create_fake(1)
		
		reset_schedule(1)
		
		# First test:
		# Create an event 5 minutes from now (the fake songs created above are all 60 seconds long)
		# Load the schedule, then watch the predicted start times of each election
		# The elections should work around the event properly
		schedule.load()
		
		# Second test:
		# Cycle through the elections and make sure the event gets played properly
		schedule.advance_station(1)
		schedule.post_process(1)
				
		# Third test: 
		# Reset the schedule, fill with elections, then create an event that is supposed to happen
		# between the elections already created in next.  Advance the schedule.
		# Observe the start times.
		
		# Fourth test: 
		# Reset the schedule, fill with elections, then add a 1up.
		# The 1up should play as soon as you advance the schedule.