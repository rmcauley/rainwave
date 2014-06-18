from libs import cache
import api.web
from api.server import handle_api_url
from api.exceptions import APIException
from api import fieldtypes
from rainwave import playlist
from rainwave import events

class GetCachedSongList(api.web.APIHandler):
	admin_required = True

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
	admin_required = True
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
	admin_required = True
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
	admin_required = True
	description = "Commit the DJ Election the user is editing."

	def post(self):
		songs = cache.get_user(self.user.id, "dj_election")
		if not songs:
			raise APIException("no_dj_election", "No songs found queued for a DJ election.")
		elec = events.election.Election.create(self.sid)
		for song in songs:
			elec.add_song(song)
		cache.set_user(self.user.id, "dj_election", None)
		self.append(self.return_name, { "success": True })