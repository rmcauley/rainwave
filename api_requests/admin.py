import time
import hashlib
import types

import api.web
from api.server import handle_api_url
from api.server import handle_url
from api.exceptions import APIException
from api import fieldtypes
from api import sync_to_back

import api_requests.playlist

from libs import config
from libs import db
from libs import cache
from rainwave import events
from rainwave import playlist

# This entire module is hastily thrown together and discards many of the standard API features
# such as locale translation, obeying HTML standards, and many times the disconnection between
# data, presentation, and so on.  It's for admins.  Not users.  QA and snazzy interfaces need not apply.
# It only needs to work.

# @handle_api_url("admin/get_one_ups")
# class GetOneUps(api.web.APIHandler):
# 	admin_required = True
# 	description = "Lists all unused OneUps."

# 	def post(self):
# 		one_ups = []
# 		for sched_id in db.c.fetch_list("SELECT r4_schedule.sched_id FROM r4_schedule WHERE sid = %s AND sched_used = FALSE ORDER BY sched_start, sched_id", (self.sid,)):
# 			one_ups.append(event.load_by_id(sched_id).to_dict(self.user))
# 		self.append("one_ups", one_ups)

# @handle_api_url("admin/add_one_up")
# class AddOneUp(api.web.APIHandler):
# 	admin_required = True
# 	fields = { "song_id": (fieldtypes.song_id, True) }
# 	description = "Adds a OneUp to the schedule."

# 	def post(self):
# 		e = event.OneUp.create(self.sid, 0, self.get_argument("song_id"))
# 		self.append(self.return_name, { "success": True, "sched_id": e.id, "text": "OneUp Added" })
# 		sync_to_back.refresh_schedule(self.sid)

# @handle_api_url("admin/delete_one_up")
# class DeleteOneUp(api.web.APIHandler):
# 	admin_required = True
# 	fields = { "sched_id": (fieldtypes.sched_id, True) }
# 	description = "Deletes a OneUp from the schedule. (regardless of whether it's used or not)"

# 	def post(self):
# 		e = event.OneUp.load_by_id(self.get_argument("sched_id"))
# 		if e.used:
# 			raise Exception("OneUp already used.")
# 		r = db.c.update("DELETE FROM r4_schedule WHERE sched_id = %s", (e.id,))
# 		if r:
# 			self.append(self.return_name, { "success": True, "text": "OneUp deleted." })
# 			sync_to_back.refresh_schedule(self.sid)
# 		else:
# 			self.append(self.return_name, { "success": False, "text": "OneUp not deleted." })

@handle_api_url("admin/set_song_cooldown")
class SetSongCooldown(api.web.APIHandler):
	admin_required = True
	sid_required = False
	description = "Sets the song cooldown multiplier and override.  Passing null or false for either argument will retain its current setting. (non-destructive update)"
	fields = { "song_id": (fieldtypes.song_id, True),
		"multiply": (fieldtypes.float_num, None),
		"override": (fieldtypes.integer, None) }

	def post(self):
		if self.get_argument("multiply") and self.get_argument("override"):
			db.c.update("UPDATE r4_songs SET song_cool_multiply = %s, song_cool_override = %s WHERE song_id = %s",
						(self.get_argument("multiply"), self.get_argument("override"), self.get_argument("song_id")))
			self.append(self.return_name, { "success": True, "text": "Song cooldown multiplier and override updated." })
		elif self.get_argument("multiply"):
			db.c.update("UPDATE r4_songs SET song_cool_multiply = %s WHERE song_id = %s",
						(self.get_argument("multiply"), self.get_argument("song_id")))
			self.append(self.return_name, { "success": True, "text": "Song cooldown multiplier updated.  Override untouched." })
		elif self.get_argument("override"):
			db.c.update("UPDATE r4_songs SET AND song_cool_override = %s WHERE song_id = %s",
						(self.get_argument("override"), self.get_argument("song_id")))
			self.append(self.return_name, { "success": True, "text": "Song cooldown override updated.  Multiplier untouched." })
		else:
			self.append(self.return_name, { "success": False, "text": "Neither multiply or override parameters set." })

@handle_api_url("admin/reset_song_cooldown")
class ResetSongCooldown(api.web.APIHandler):
	admin_required = True
	sid_required = False
	description = "Sets song cooldown override to null and sets cooldown multiplier to 1."
	fields = { "song_id": (fieldtypes.song_id, True) }

	def post(self):
		db.c.update("UPDATE r4_songs SET song_cool_multiply = 1, song_cool_override = NULL WHERE song_id = %s",
					(self.get_argument("song_id"),))
		self.append(self.return_name, { "success": True, "text": "Song cooldown reset." })

@handle_api_url("admin/set_album_cooldown")
class SetAlbumCooldown(api.web.APIHandler):
	admin_required = True
	description = "Sets the album cooldown multiplier and override PER STATION.  Passing null or false for either argument will retain its current setting. (non-destructive update)"
	fields = { "album_id": (fieldtypes.album_id, True),
		"multiply": (fieldtypes.float_num, None),
		"override": (fieldtypes.integer, None) }

	def post(self):
		if self.get_argument("multiply") and self.get_argument("override"):
			db.c.update("UPDATE r4_album_sid SET album_cool_multiply = %s, album_cool_override = %s WHERE album_id = %s AND sid = %s",
						(self.get_argument("multiply"), self.get_argument("override"), self.get_argument("album_id"), self.sid))
			self.append(self.return_name, { "success": True, "text": "Album cooldown multiplier and override updated." })
		elif self.get_argument("multiply"):
			db.c.update("UPDATE r4_album_sid SET album_cool_multiply = %s WHERE album_id = %s AND sid = %s",
						(self.get_argument("multiply"), self.get_argument("album_id"), self.sid))
			self.append(self.return_name, { "success": True, "text": "Album cooldown multiplier updated.  Override untouched." })
		elif self.get_argument("override"):
			db.c.update("UPDATE r4_album_sid SET album_cool_override = %s WHERE album_id = %s AND sid = %s",
						(self.get_argument("override"), self.get_argument("album_id"), self.sid))
			self.append(self.return_name, { "success": True, "text": "Album cooldown override updated.  Override untouched." })
		else:
			self.append(self.return_name, { "success": False, "text": "Neither multiply or override parameters set." })

@handle_api_url("admin/reset_album_cooldown")
class ResetAlbumCooldown(api.web.APIHandler):
	admin_required = True
	description = "Sets album cooldown override to null and sets cooldown multiplier to 1."
	fields = { "album_id": (fieldtypes.album_id, True) }

	def post(self):
		db.c.update("UPDATE r4_album_sid SET album_cool_multiply = 1, album_cool_override = NULL WHERE album_id = %s AND sid = %s",
						(self.get_argument("album_id"), self.sid))
		self.append(self.return_name, { "success": True, "text": "Album cooldown multiplier and override reset." })

@handle_api_url("admin/set_song_request_only")
class SetSongRequestOnly(api.web.APIHandler):
	admin_required = True
	sid_required = True
	description = "Sets a song to be played only by request."
	fields = { "song_id": (fieldtypes.song_id, True), "request_only": (fieldtypes.boolean, True) }

	def post(self):
		if self.get_argument("request_only"):
			db.c.update("UPDATE r4_song_sid SET song_request_only = TRUE WHERE song_id = %s AND sid = %s", (self.get_argument("song_id"), self.sid))
			self.append(self.return_name, { "success": True, "text": "Song ID %s is now request only." % self.get_argument("song_id") })
		else:
			db.c.update("UPDATE r4_song_sid SET song_request_only = FALSE WHERE song_id = %s AND sid = %s", (self.get_argument("song_id"), self.sid))
			self.append(self.return_name, { "success": True, "text": "Song ID %s is not request only." % self.get_argument("song_id") })

@handle_api_url("admin/backend_scan_errors")
class BackendScanErrors(api.web.APIHandler):
	return_name = "backend_scan_errors"
	admin_required = True
	sid_required = False
	description = "A list of errors that have occurred while scanning music."

	def post(self):
		errors = cache.get("backend_scan_errors") or [ { "time": time.time(), "nothing": "No errors in memory." } ]
		self.append(self.return_name, errors)

@handle_api_url("admin/get_dj_election")
class GetDJElection(api.web.APIHandler):
	return_name = "dj_election"
	admin_required = True
	description = "Get the queued songs for a DJ election."

	def post(self):
		songs = cache.get_user(self.user.id, "dj_election")
		if songs:
			to_output = []
			for song in songs:
				to_output.append(song.to_dict())
			self.append(self.return_name, to_output)
		else:
			self.append(self.return_name, [])

@handle_api_url("admin/add_to_dj_election")
class AddToDJElection(api.web.APIHandler):
	return_name = "dj_election"
	admin_required = True
	description = "Add a song to a DJ Election."
	fields = { "song_id": ( fieldtypes.song_id, True ), "song_sid": ( fieldtypes.sid, True) }

	def post(self):
		songs = cache.get_user(self.user.id, "dj_election")
		if not songs:
			songs = []
		songs.append(playlist.Song.load_from_id(self.get_argument("song_id"), self.get_argument("song_sid")))
		cache.set_user(self.user.id, "dj_election", songs)
		to_output = []
		for song in songs:
			to_output.append(song.to_dict())
		self.append(self.return_name, to_output)

@handle_api_url("admin/remove_from_dj_election")
class RemoveFromDJElection(api.web.APIHandler):
	admin_required = True
	description = "Remove a song from the DJ Election currently being setup."
	fields = { "song_id": (fieldtypes.song_id, True) }

	def post(self):
		songs = cache.get_user(self.user.id, "dj_election")
		if not songs:
			raise APIException("no_dj_election", "No songs found queued for a DJ election.")
		for song in songs:
			if song.id == self.get_argument("song_id"):
				songs.remove(song)
		cache.set_user(self.user.id, "dj_election", songs)
		self.append(self.return_name, { "success": True })

@handle_api_url("admin/commit_dj_election")
class CommitDJElection(api.web.APIHandler):
	admin_required = True
	description = "Commit the DJ Election the user is editing."
	fields = { "priority": (fieldtypes.boolean, True) }

	def post(self):
		songs = cache.get_user(self.user.id, "dj_election")
		if not songs:
			raise APIException("no_dj_election", "No songs found queued for a DJ election.")
		elec = events.election.Election.create(self.sid)
		for song in songs:
			elec.add_song(song)
		if self.get_argument("priority"):
			elec.set_priority(True)
		cache.set_user(self.user.id, "dj_election", None)
		self.append(self.return_name, { "success": True })
		sync_to_back.refresh_schedule(self.sid)
