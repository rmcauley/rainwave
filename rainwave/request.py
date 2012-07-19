from libs import db
from rainwave import playlist

def get_line_list(sid):
	# TODO: It's possible to join r4_request_line to r4_songs and r4_albums using r4_request_line.line_top_song_id but considering song<->album
	# is a many-to-many relationship, that's gonna be one ugly SQL statement.
	# Maybe use the cache from below... :)
	return db.c.fetch_all("SELECT username, user_id, line_expiry_tune_in, line_expiry_election FROM r4_request_line JOIN phpbb_users USING (user_id) WHERE sid = %s ORDER BY line_wait_start", (sid,))

def get_expiry_times_dict(sid):
	expiries = db.c.fetch_all("SELECT * FROM r4_request_line WHERE sid = %s", (sid,))
	expiry_times = {}
	for row in expiries:
		expiry_times[row['user_id']] = None
		if not row['line_expiry_tune_in'] and not row['line_expiry_election']:
			pass
		elif row['line_expiry_tune_in'] and not row['line_expiry_election']:
			expiry_times[row['user_id']] = row['line_expiry_tune_in']
		elif row['line_expiry_election'] and not row['line_expiry_tune_in']:
			expiry_times[row['user_id']] = row['line_expiry_election']
		elif row['line_expiry_election'] <= row['line_expiry_tune_in']:
			expiry_times[row['user_id']] = row['line_expiry_election']
		else:
			expiry_times[row['user_id']] = row['line_expiry_tune_in']
	return expiry_times

def get_next(sid):
	request = db.c.fetch_row("SELECT username, r4_request_line.user_id, song_id "
		"FROM r4_listeners JOIN r4_request_line USING (user_id) JOIN phpbb_users USING (user_id) JOIN r4_request_store USING (user_id) JOIN r4_song_sid USING (song_id) "
		"WHERE r4_listeners.sid = %s AND listener_purge = FALSE AND r4_request_line.sid = %s AND song_cool = FALSE AND song_elec_blocked = FALSE "
		"ORDER BY line_wait_start LIMIT 1",
		(sid, sid))
	if not request:
		return None
	song = playlist.Song.load_from_id(request['song_id'], sid)
	song.data['elec_request_user_id'] = request['user_id']
	song.data['elec_request_username'] = request['username']
	return song
