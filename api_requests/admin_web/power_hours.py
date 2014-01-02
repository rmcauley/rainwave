import datetime
import time
import types
from pytz import timezone

from libs import config
import api.web
from api.server import handle_api_url
from api.server import handle_url
from api_requests.admin_web.index import AlbumList
from api_requests.admin_web.index import SongList

from api_requests.admin import power_hours
from api_requests.admin_web import index

@handle_url("/admin/tools/power_hours")
class WebListPowerHours(api.web.PrettyPrintAPIMixin, power_hours.ListPowerHours):
	def get(self):
		self.write(self.render_string("bare_header.html", title="%s Power Hours" % config.station_id_friendly[self.sid]))
		self.write("<h2>%s Power Hours</h2>" % config.station_id_friendly[self.sid])

		self.write("<div><u>Create New</u><br><br>Input date and time in YOUR timezone.<br>")
		self.write("Name: <input id='new_ph_name' type='text' /><br>")
		index.write_html_time_form(self, "new_ph", time.time())
		self.write("<br><button onclick=\"window.top.call_api('admin/create_power_hour', ")
		self.write("{ 'utc_time': document.getElementById('new_ph_timestamp').value, 'name': document.getElementById('new_ph_name').value });\"")
		self.write(">Create new Power Hour</button></div><hr>")

		if self.return_name in self._output and type(self._output[self.return_name]) == types.ListType and len(self._output[self.return_name]) > 0:
			self.write("<ul>")
			for producer in self._output[self.return_name]:
				self.write("<li><div><b><a href='/admin/tools/power_hour_detail?sid=%s&sched_id=%s'>%s</a></b></div>" % (self.sid, producer['id'], producer['name']))
				self.write("<div style='font-family: monospace;'>%s</div>" % datetime.datetime.fromtimestamp(producer['start'], timezone('US/Eastern')).strftime("%a %b %d/%Y %H:%M %Z"))
				self.write("<div style='font-family: monospace;'>%s</div>" % datetime.datetime.fromtimestamp(producer['start'], timezone('US/Pacific')).strftime("%a %b %d/%Y %H:%M %Z"))
				self.write("<div style='font-family: monospace;'>%s</div>" % datetime.datetime.fromtimestamp(producer['start'], timezone('Europe/London')).strftime("%a %b %d/%Y %H:%M %Z (UK)"))
				self.write("</div></li>")
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/tools/power_hour_detail")
class WebPowerHourDetail(api.web.PrettyPrintAPIMixin, power_hours.GetPowerHour):
	def get(self):
		if not self._output or not self.return_name in self._output:
			self.write("<a href='/admin/tools/power_hours?sid=%s'>No such Power Hour.  Click here to go back to the listing.</a>" % self.sid)
			return
		ph = self._output[self.return_name]
		self.write(self.render_string("bare_header.html", title="%s" % ph['name']))
		self.write("<h2>%s</h2>" % ph['name'])
		self.write("<span>Times:</span><br>")
		self.write("<div style='font-family: monospace;'>%s</div>" % datetime.datetime.fromtimestamp(ph['start'], timezone('US/Eastern')).strftime("%a %b %d/%Y %H:%M %Z"))
		self.write("<div style='font-family: monospace;'>%s</div>" % datetime.datetime.fromtimestamp(ph['start'], timezone('US/Pacific')).strftime("%a %b %d/%Y %H:%M %Z"))
		self.write("<div style='font-family: monospace;'>%s</div>" % datetime.datetime.fromtimestamp(ph['start'], timezone('Europe/London')).strftime("%a %b %d/%Y %H:%M %Z (UK)"))

		self.write("<br><span>Change time.  Use YOUR timezone.</span><br>")
		index.write_html_time_form(self, "power_hour", ph['start'])
		self.write("<br><button onclick=\"window.top.call_api('admin/change_start_time', ")
		self.write("{ 'utc_time': document.getElementById('power_hour_timestamp').value, 'sched_id': %s });\"" % ph['id'])
		self.write(">Change Time</button></div><hr>")

		self.write("<button onclick=\"window.top.call_api('admin/delete_producer', { 'sched_id': %s });\">Delete This Power Hour</button><hr>" % ph['id'])

		self.write("Name: <input type='text' id='new_ph_name' value='%s'><br>" % ph['name'])
		self.write("<button onclick=\"window.top.call_api('admin/change_producer_name', { 'sched_id': %s, 'name': document.getElementById('new_ph_name').value });\">Change Name</button><hr>" % ph['id'])

		self.write("<button onclick=\"window.top.call_api('admin/shuffle_power_hour', { 'sched_id': %s });\">Shuffle the Song Order</button><hr>" % ph['id'])