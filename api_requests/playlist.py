import tornado.web

from api.web import RequestHandler
from api import fieldtypes
from api.server import test_get
from api.server import test_post
from api.server import handle_api_url

from libs import cache
from libs import log
from libs import db
from rainwave import playlist

def get_all_albums(sid, user = None):
	if not user or user.is_anonymous():
		return cache.get_station(sid, "all_albums")
	else:
		return playlist.get_all_albums_list(sid, user)

@handle_api_url("all_albums")
class AllAlbumsRequestHandler(RequestHandler):
	return_name = "all_albums"
	
	def post(self):
		self.append(self.return_name, get_all_albums(self.sid, self.user))
