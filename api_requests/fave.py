import time

from api import fieldtypes
from api.web import RequestHandler
from api.server import handle_url

@handle_url('fave')
class SubmitFave(RequestHandler):
	return_name = "fave_result"
	login_required = True
	tunein_required = False
	unlocked_listener_only = True
	description = "Fave a song."
	fields = {
		"song_id": (fieldtypes.integer, True),
		"fave": (fieldtypes.boolean, True)
	}
	
	def get(self):
		if self.fave(self, self.arguments["song_id"], self.arguments["fave"]):
			self.append(self.return_name, { "code": 0, "text": "Fave submitted." })
		else:
			self.append(self.return_name, { "code": -1, "text": "Fave failed." })
	
	def fave(self, song_id, fave):
		if db.c.fetch_var("SELECT song_id FROM r4_song_ratings WHERE song_id = %s AND user_id = %s LIMIT 1", (song_id, self.user.id)):
			if not db.c.update("UPDATE r4_song_ratings SET song_fave = %s WHERE song_id = %s AND user_id = %s LIMIT 1", (fave, song_id, self.user.id)):
				return False
		else:
			if not db.c.update("INSERT INTO r4_song_ratings (song_id, user_id, song_fave) VALUES (%s, %s, %s, %s, %s, %s)", (song_id, self.user.id, fave)):
				return False
		return True
