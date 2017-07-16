from libs import cache
import api.web
from api.server import handle_api_url
from api.exceptions import APIException
from api import fieldtypes
from rainwave import playlist
from rainwave import events
from libs import db

class GetCachedSongList(api.web.APIHandler):
	dj_preparation = True

	def post(self):
		songs = cache.get_user(self.user.id, self.return_name)
		if songs:
			to_output = []
			for song in songs:
				to_output.append(song.to_dict())
			self.append(self.return_name, to_output)
		else:
			self.append(self.return_name, [])

class AddToCachedSongList(api.web.APIHandler):
	dj_preparation = True
	allow_sid_zero = True
	fields = { "song_id": ( fieldtypes.song_id, True ), "song_sid": ( fieldtypes.sid, True) }

	def post(self):
		songs = cache.get_user(self.user.id, self.return_name)
		if not songs:
			songs = []
		songs.append(playlist.Song.load_from_id(self.get_argument("song_id"), self.get_argument("song_sid")))
		cache.set_user(self.user.id, self.return_name, songs)
		to_output = []
		for song in songs:
			to_output.append(song.to_dict())
		self.append(self.return_name, to_output)

class RemoveFromCachedSongList(api.web.APIHandler):
	dj_preparation = True
	fields = { "song_id": (fieldtypes.song_id, True) }

	def post(self):
		songs = cache.get_user(self.user.id, self.return_name)
		if not songs:
			raise APIException("no_dj_election", "No songs found queued for a DJ election.")
		for song in songs:
			if song.id == self.get_argument("song_id"):
				songs.remove(song)
		cache.set_user(self.user.id, self.return_name, songs)
		self.append(self.return_name, { "success": True })

@handle_api_url("admin/get_dj_election")
class GetDJElection(GetCachedSongList):
	return_name = "dj_election"
	description = "Get the queued songs for a DJ election."

@handle_api_url("admin/add_to_dj_election")
class AddToDJElection(AddToCachedSongList):
	return_name = "dj_election"
	description = "Add a song to a DJ Election."

@handle_api_url("admin/remove_from_dj_election")
class RemoveFromDJElection(RemoveFromCachedSongList):
	return_name = "dj_election"
	description = "Remove a song from the DJ Election currently being setup."

@handle_api_url("admin/commit_dj_election")
class CommitDJElection(api.web.APIHandler):
	dj_preparation = True
	description = "Commit the DJ Election the user is editing."
	fields = { "sched_id": (fieldtypes.sched_id, False) }

	def post(self):
		songs = cache.get_user(self.user.id, "dj_election")
		if not songs:
			raise APIException("no_dj_election", "No songs found queued for a DJ election.")
		if self.get_argument("sched_id", None) and not self.user.is_admin:
			if not self.user.id == db.c.fetch_var("SELECT sched_dj_user_id FROM r4_schedule WHERE sched_id = %s", (self.get_argument("sched_id"),)):
				raise APIException("auth_required", http_code=403)
		elec = events.election.Election.create(self.sid, self.get_argument("sched_id"))
		for song in songs:
			elec.add_song(song)
		cache.set_user(self.user.id, "dj_election", None)
		self.append(self.return_name, { "success": True })

@handle_api_url("admin/delete_election")
class DeleteElection(api.web.APIHandler):
	dj_preparation = True
	description = "Delete an existing election."
	fields =  {"elec_id": (fieldtypes.elec_id, True) }

	def post(self):
		elec = events.election.Election.load_by_id(self.get_argument("elec_id"))
		can_delete = self.user.is_admin()
		if not can_delete:
			if not self.user.id == db.c.fetch_var("SELECT sched_dj_user_id FROM r4_schedule WHERE sched_id = %s", (elec.sched_id,)):
				raise APIException("auth_required", http_code=403)
		elec.delete()
		self.append(self.return_name, { "success": True })