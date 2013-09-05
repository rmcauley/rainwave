import tornado.web
import tornado.escape
import time

from api.server import handle_url
import api.web

from rainwave.user import User
from libs import config

def get_round_robin_url(sid, filetype, user = None):
	return "http://%s/%s\n" % (config.get_station(sid, "round_robin_relay_host"), get_stream_filename(sid, filetype, user))

def get_stream_filename(sid, filetype, user = None):
	filename = config.get_station(self.output_sid, "stream_filename")
	
	if user.is_anonymous():
		return "%s.%s" % (filename, filetype)
	else:
		return "%s.%s?%s:%s" % (filename, filetype, user.id, user.data['radio_listen_key'])

@handle_url("/tune_in/(\w+|\d)\.(ogg|mp3)")
class TuneInIndex(api.web.HTMLRequest):
	output_sid = None
	after_the_slash = None
	
	def prepare(self):
		super(TuneInIndex, self).prepare()
		self.set_header("Content-Type", "audio/x-mpegurl")
		self.set_header("Cache-Control", "no-cache, must-revalidate")
		self.set_header("Expires", "Mon, 26 Jul 1997 05:00:00 GMT")
		
	def set_sid(self, url_param, filetype):
		if url_param:
			url_param_int = api.web.fieldtypes.positive_integer(url_param)
			if not url_param_int:
				for k, v in config.station_id_friendly.iteritems():
					if v.lower() == url_param.lower():
						self.output_sid = k
						break
			else:
				self.output_sid = url_param_int

		if not self.output_sid:
			raise tornado.web.HTTPError(404)
		if not self.output_sid in config.station_ids:
			raise tornado.web.HTTPError(404)
		
		self.after_the_slash = get_stream_filename(self.output_sid, self.user)
	
		self.set_header("Content-Disposition", "inline; filename=\"rainwave_%s_%s.m3u\"" % (config.station_id_friendly[self.output_sid].lower(), filetype))
	
	def get(self, url_param, filetype):
		self.set_sid(url_param, filetype)
		
		self.write("#EXTINF:0,Rainwave %s: %s\n" % (config.station_id_friendly[self.output_sid], self.locale.translate("random_relay")))
		self.write()
		
		for relay_name, relay in config.get("relays").iteritems():
			if self.output_sid in relay['sids']:
				self.write("#EXTINF:0, Rainwave %s: %s Relay\n" % (config.station_id_friendly[self.output_sid], relay_name))
				self.write("%s%s:%s/%s\n" % (relay['protocol'], relay['ip_address'], relay['port'], self.after_the_slash))
