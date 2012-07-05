from libs import db
from rainwave import playlist

def update_all_list():
	pass

def get_next(sid):
	request = db.c.fetch_row("SELECT username, r4_request_line.user_id, song_id "
		"FROM r4_listeners JOIN r4_request_line USING (user_id) JOIN phpbb_users USING (user_id) JOIN r4_request_store USING (user_id) JOIN r4_song_sid USING (song_id) "
		"WHERE r4_listeners.sid = %s AND listener_purge = FALSE AND r4_request_line.sid = %s AND song_cool = FALSE AND song_elec_blocked = FALSE "
		"ORDER BY line_wait_start LIMIT 1",
		(sid, sid))
	if not request:
		return None
	return playlist.Song.load_from_id(request['song_id'], sid)
