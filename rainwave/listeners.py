import time

from libs import db

def get_listeners_dict(sid):
	guests = db.c.fetch_var("SELECT COUNT(*) FROM r4_listeners WHERE sid = %s AND user_id = 1 AND listener_purge = FALSE", (sid,))
	# SLOW QUERY
	clist = db.c.fetch_all(
		"SELECT r4_listeners.user_id, username, COUNT(vote_time) AS radio_2wkvotes "
		"FROM r4_listeners JOIN phpbb_users USING (user_id) "
		"LEFT JOIN r4_vote_history ON (phpbb_users.user_id = r4_vote_history.user_id AND vote_time < %s) "
		"WHERE r4_listeners.sid = %s AND r4_listeners.user_id > 1 "
		"GROUP BY r4_listeners.user_id, username "
		"ORDER BY radio_2wkvotes DESC, username",
		((int(time.time()) - 1209600), sid))	# 1209600 is 2 weeks in seconds
	return { "guests": guests, "users": clist }