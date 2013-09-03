import tornado.web
import tornado.escape
import time

from api.server import handle_url
import api.web

from rainwave.user import User
from libs import config

@handle_url("/tune_in/(\w+|\d)\.(ogg|mp3)")
class TuneInIndex(api.web.HTMLRequest):
	output_sid = None
	filename = None
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
		
		self.filename = config.station_id_friendly[self.output_sid].lower()
		self.set_header("Content-Disposition", "inline; filename=\"rainwave_%s.m3u\"" % self.filename);
		
		if self.user.is_anonymous():
			self.after_the_slash = "%s.%s" % (self.filename, filetype)
		else:
			self.after_the_slash = "%s.%s?%s:%s" % (self.filename, filetype, self.user.id, self.user.data['radio_listen_key'])
	
	def get(self, url_param, filetype):
		self.set_sid(url_param, filetype)
		
		self.write("#EXTINF:0,Rainwave %s: %s\n" % (config.station_id_friendly[self.output_sid], self.locale.translate("random_relay")))
		self.write("http://%s/%s\n" % (config.get_station(self.output_sid, "round_robin_relay_host"), self.after_the_slash))
		
		for relay_name, relay in config.get("relays").iteritems():
			if self.output_sid in relay['sids']:
				self.write("#EXTINF:0, Rainwave %s: %s Relay\n" % (config.station_id_friendly[self.output_sid], relay_name))
				self.write("%s%s:%s/%s\n" % (relay['protocol'], relay['ip_address'], relay['port'], self.after_the_slash))
