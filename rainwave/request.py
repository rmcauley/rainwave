import time
from libs import db
from libs import cache
from libs import log
from rainwave import playlist
from rainwave.user import User

def update_line(sid):
	# Get everyone in the line
	line = db.c.fetch_all("SELECT username, user_id, line_expiry_tune_in, line_expiry_election, line_wait_start FROM r4_request_line JOIN phpbb_users USING (user_id) WHERE r4_request_line.sid = %s AND radio_requests_paused = FALSE ORDER BY line_wait_start", (sid,))
	new_line = []
	# user_positions has user_id as a key and position as the value, this is cached for quick lookups by API requests
	# so users know where they are in line
	user_positions = {}
	t = int(time.time())
	albums_with_requests = []
	position = 1
	# For each person
	for row in line:
		add_to_line = False
		u = User(row['user_id'])
		row['song_id'] = None
		# If their time is up, remove them and don't add them to the new line
		if row['line_expiry_tune_in'] and row['line_expiry_tune_in'] <= t:
			log.debug("request_line", "%s: Removed user ID %s from line for tune in timeout, expiry time %s current time %s" % (sid, u.id, row['line_expiry_tune_in'], t))
			u.remove_from_request_line()
		else:
			tuned_in_sid = db.c.fetch_var("SELECT sid FROM r4_listeners WHERE user_id = %s AND sid = %s AND listener_purge = FALSE", (u.id, sid))
			tuned_in = True if tuned_in_sid == sid else False
			if tuned_in:
				# Get their top song ID
				song_id = u.get_top_request_song_id(sid)
				# If they have no song and their line expiry has arrived, boot 'em
				if not song_id and row['line_expiry_election'] and (row['line_expiry_election'] <= t):
					log.debug("request_line", "%s: Removed user ID %s from line for election timeout, expiry time %s current time %s" % (sid, u.id, row['line_expiry_election'], t))
					u.remove_from_request_line()
					# Give them more chances if they still have requests
					# They'll get added to the line of whatever station they're tuned in to (if any!)
					if u.has_requests():
						u.put_in_request_line(u.get_tuned_in_sid())
				# If they have no song, start the expiry countdown
				elif not song_id and not row['line_expiry_election']:
					row['line_expiry_election'] = t + 900
					db.c.update("UPDATE r4_request_line SET line_expiry_election = %s WHERE user_id = %s", ((t + 900), row['user_id']))
					add_to_line = True
				# Keep 'em in line
				else:
					if song_id:
						albums_with_requests.append(db.c.fetch_var("SELECT album_id FROM r4_songs WHERE song_id = %s", (song_id,)))
					row['song_id'] = song_id
					add_to_line = True
			elif not row['line_expiry_tune_in'] or row['line_expiry_tune_in'] == 0:
				db.c.update("UPDATE r4_request_line SET line_expiry_tune_in = %s WHERE user_id = %s", ((t + 900), row['user_id']))
				add_to_line = True
			else:
				add_to_line = True
		if add_to_line:
			new_line.append(row)
			user_positions[u.id] = position
			position = position + 1

	cache.set_station(sid, "request_line", new_line, True)
	cache.set_station(sid, "request_user_positions", user_positions, True)

	db.c.update("UPDATE r4_album_sid SET album_requests_pending = NULL WHERE album_requests_pending = TRUE AND sid = %s", (sid,))
	for album_id in albums_with_requests:
		db.c.update("UPDATE r4_album_sid SET album_requests_pending = TRUE WHERE album_id = %s AND sid = %s", (album_id, sid))

	return new_line

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

def get_next(sid, start_at_position = 0):
	line = cache.get_station(sid, "request_line")
	if not line:
		return None
	if start_at_position > 0 and len(line) <= 3:
		start_at_position = 0
	song = None
	for pos in range(start_at_position, len(line)):
		if not line[pos]:
			pass  # ?!?!
		elif not line[pos]['song_id']:
			log.debug("request", "Passing on user %s since they have no valid first song." % line[pos]['username'])
		else:
			entry = line.pop(pos)
			song = playlist.Song.load_from_id(entry['song_id'], sid)
			log.debug("request", "Fulfilling %s's request for %s." % (entry['username'], song.filename))
			song.data['elec_request_user_id'] = entry['user_id']
			song.data['elec_request_username'] = entry['username']

			u = User(entry['user_id'])
			db.c.update("DELETE FROM r4_request_store WHERE user_id = %s AND song_id = %s", (u.id, entry['song_id']))
			u.remove_from_request_line()
			if u.has_requests():
				u.put_in_request_line(u.get_tuned_in_sid())
			request_count = db.c.fetch_var("SELECT COUNT(*) FROM r4_request_history WHERE user_id = %s", (u.id,)) + 1
			db.c.update("DELETE FROM r4_request_store WHERE song_id = %s AND user_id = %s", (song.id, u.id))
			db.c.update("INSERT INTO r4_request_history (user_id, song_id, request_wait_time, request_line_size, request_at_count, sid) "
						"VALUES (%s, %s, %s, %s, %s, %s)",
						(u.id, song.id, time.time() - entry['line_wait_start'], len(line), request_count, sid))
			db.c.update("UPDATE phpbb_users SET radio_totalrequests = %s WHERE user_id = %s", (request_count, u.id))
			song.update_request_count(sid)
			# If we fully update the line, the user may sneak in and get 2 requests in the same election.
			# This is not a good idea, so we leave it to the scheduler to issue the full cache update.
			cache.set_station(sid, "request_line", line, True)
			break

	return song
