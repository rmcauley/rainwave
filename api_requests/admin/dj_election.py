from libs import cache
import api.web
from api.server import handle_api_url
from api.server import handle_url
from api.exceptions import APIException
from api import fieldtypes
from rainwave import playlist

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
