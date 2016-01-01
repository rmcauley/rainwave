from api.server import handle_url
from api.web import HTMLRequest
from libs import config

@handle_url("/twitch/")
@handle_url("/widget/")
class StreamHelp(HTMLRequest):
	auth_required = False
	sid_required = False

	def get(self):
		self.render("stream_help.html",
			revision_number=config.build_number,
			title="Rainwave Now Playing for Twitch Streamers")

@handle_url("/twitch/widget")
@handle_url("/widget/widget")
class StreamIndex(HTMLRequest):
	auth_required = False
	sid_required = True

	def get(self):
		self.render("stream_widget.html",
			sid=self.sid,
			revision_number=config.build_number)