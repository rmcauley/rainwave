import time
from libs import db
from libs import cache
from rainwave import playlist
from rainwave.user import User

def update_cache(sid):
	update_line(sid)
	update_expire_times()

def update_line(sid):
	# Get everyone in the line
	line = db.c.fetch_all("SELECT username, user_id, line_expiry_tune_in, line_expiry_election, line_wait_start FROM r4_request_line JOIN phpbb_users USING (user_id) WHERE sid = %s ORDER BY line_wait_start", (sid,))
	new_line = []
	# user_positions has user_id as a key and position as the value, this is cached for quick lookups by API requests
	# so users know where they are in line
	user_positions = {}
	t = int(time.time())
	position = 1
	# For each person
	for row in line:
		add_to_line = False
		u = User(row['user_id'])
		u.refresh_sid = sid
		row['song_id'] = None
		# If their time is up, remove them and don't add them to the new line
		if row['line_expiry_tune_in'] and row['line_expiry_tune_in'] <= t:
			u.remove_from_request_line()
		else:
			u.refresh()
			# do nothing if they're not tuned in
			if not u.data['radio_tuned_in']:
				pass
			else:
				# Get their top song ID
				song_id = u.get_top_request_song_id(sid)
				# If they have no song and their line expiry has arrived, boot 'em
				if not song_id and row['line_expiry_election'] and (row['line_expiry_election'] <= t):
					u.remove_from_request_line()
					# Give them a second chance if they still have requests
					# They'll get added to the line of whatever station they're tuned in to (if any!)
					if u.has_requests():
						u.put_in_request_line(u.get_tuned_in_sid())
				# If they have no song, start the expiry countdown
				elif not song_id:
					row['line_expiry_election'] = t + 600
					db.c.update("UPDATE r4_request_line SET line_expiry_election = %s WHERE user_id = %s", (row['line_expiry_election'], row['user_id']))
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
	expiry_times = {}
	for row in db.c.fetch_all("SELECT * FROM r4_request_line"):
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
	line = cache.get_station(sid, "request_line")
	if not line:
		return None
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
			user_sid = u.get_tuned_in_sid()
			if u.has_requests():
				u.put_in_request_line(user_sid)
			request_count = db.c.fetch_var("SELECT COUNT(*) FROM r4_request_history WHERE user_id = %s", (u.id,)) + 1
			db.c.update("DELETE FROM r4_request_store WHERE song_id = %s AND user_id = %s", (song.id, u.id))
			db.c.update("INSERT INTO r4_request_history (user_id, song_id, request_wait_time, request_line_size, request_at_count) "
						"VALUES (%s, %s, %s, %s, %s)",
						(u.id, song.id, time.time() - entry['line_wait_start'], len(line), request_count))
			# Update the user's request cache
			u.get_requests(refresh=True)
			cache.set_station(sid, "request_line", line, True)
			break

	return song
