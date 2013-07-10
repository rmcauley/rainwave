import time
from libs import db
from libs import cache
from rainwave import playlist
from rainwave.user import User

# TODO: This entire module needs a big whoppin' code review

def update_cache(sid):
	update_expire_times()
	update_line(sid)
	
def update_line(sid):
	# TODO: This needs code review
	# TODO: Where's the part of this function that updates the database?
	# Get everyone in the line
	line = db.c.fetch_all("SELECT username, user_id, line_expiry_tune_in, line_expiry_election FROM r4_request_line JOIN phpbb_users USING (user_id) WHERE sid = %s ORDER BY line_wait_start", (sid,))
	new_line = []
	user_positions = {}
	t = int(time.time())
	position = 1
	# For each person
	for row in line:
		add_to_line = False
		u = User(row['user_id'])
		row['song_id'] = None
		# If their time is up, remove them and don't add them to the new line
		if row['line_expiry_tune_in'] <= t:
			u.remove_from_request_line()
		else:
			# refresh the user to get their data, using local cache only - speed things up here
			u.refresh()
			# do nothing if they're not tuned in
			if not u.data['radio_tuned_in']:
				pass
			else:
				# Get their top song ID
				song_id = u.get_top_request_song_id(sid)
				# If they have no song and their line expiry has arrived, boot 'em
				if not song_id and (row['line_expiry_election'] <= t):
					u.remove_from_request_line()
					# Give them a second chance if they still have requests, this is SID-indiscriminate
					# they'll get added to whatever line is their top request
					if u.has_requests():
						u.put_in_request_line(u.get_top_request_sid())
				# If they have no song, start the expiry countdown
				elif not song_id:
					row['line_expiry_election'] = t + 600
					add_to_line = True
				# Keep 'em in line
				else:
					row['song_id'] = song_id
					add_to_line = True
		if add_to_line:
			new_line.append(row)
			user_positions[u.id] = position
			position = position + 1
	
	cache.set_station(sid, "request_line", new_line, True)
	cache.set_station(sid, "request_user_positions", user_positions, True)

def update_expire_times():
	# TODO: Are we using songs or time for election expiries?
	expiries = db.c.fetch_all("SELECT * FROM r4_request_line")
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
	cache.set("request_expire_times", expiry_times, True)

def get_next(sid):
	# TODO: Code review
	line = cache.get_station(sid, "request_line")
	song = None
	for pos in range(0, len(line)):
		if not line[pos] or not line[pos]['song_id']:
			pass
		else:
			entry = line.pop(pos)
			song = playlist.Song.load_from_id(entry['song_id'], sid)
			song.data['elec_request_user_id'] = entry['user_id']
			song.data['elec_request_username'] = entry['username']
			
			u = User(entry['user_id'])
			db.c.update("DELETE FROM r4_request_store WHERE user_id = %s AND song_id = %s", (u.id, entry['song_id']))
			u.remove_from_request_line()
			if u.has_requests():
				u.put_in_request_line(u.get_top_request_sid())
			cache.set_station(sid, "request_line", line, True)
			# TODO: Add to review history
			break

	return song
