import tornado.ioloop
import time
from libs import db
import tempfile
import os

def inactive_checking():
	last_time = 0
	if os.path.isfile("%s/r4_inactive_check" % tempfile.gettempdir()):
		f = open("%s/r4_inactive_check" % tempfile.gettempdir())
		t = f.read()
		f.close()
		try:
			last_time = int(t)
		except Exception:
			pass
	if (not last_time) or (last_time < (time.time() - 86400)):
		_update_inactive()

def _update_inactive():
	f = open("%s/r4_inactive_check" % tempfile.gettempdir(), 'w')
	f.write(str(int(time.time())))
	f.close()
	vote_threshold = time.time() - (86400 * 30)
	db.c.update("UPDATE phpbb_users SET radio_inactive = TRUE "
				"FROM r4_vote_history "
				"WHERE phpbb_users.radio_inactive = FALSE AND phpbb_users.user_id = r4_vote_history.user_id AND vote_time < %s",
				(vote_threshold,))

checking = tornado.ioloop.PeriodicCallback(inactive_checking, 360000) 
checking.start()