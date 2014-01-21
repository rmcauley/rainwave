import datetime
import time
import types
from pytz import timezone

from libs import log
from libs import config
import api.web
from api.server import handle_api_url
from api.server import handle_url
from api_requests.admin import producers
from rainwave.events import event
from api_requests.admin_web import index
from api_requests.admin_web.power_hours import get_ph_formatted_time

# this makes sure all the event modules get loaded correctly
from rainwave import schedule

@handle_url("/admin/tools/producers")
class WebCreateProducer(api.web.HTMLRequest):
	admin_required = True
	sid_required = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="%s Create Producer" % config.station_id_friendly[self.sid]))
		self.write("<h2>%s: Create Producer</h2>" % config.station_id_friendly[self.sid])
		self.write("<script>\nwindow.top.refresh_all_screens = false;\n</script>")

		self.write("<div>Input date and time in YOUR timezone.<br>")
		# it says 'ph' because I super-lazily copy/pasted this from the power hour creator code
		self.write("<div>Type: <select id='new_ph_type' type='text' />")
		for producer_type in event.all_producers.keys():
			self.write("<option value='%s'>%s</option>" % (producer_type, producer_type))
		self.write("</select><br>")
		self.write("Name: <input id='new_ph_name' type='text' /><br>")
		self.write("URL: <input id='new_ph_url' type='text' /><br>")
		index.write_html_time_form(self, "new_ph")
		self.write("<br><button onclick=\"window.top.call_api('admin/create_producer', ")
		self.write("{ 'producer_type': 'OneUpProducer', 'end_utc_time': document.getElementById('new_ph_timestamp').value, 'start_utc_time': document.getElementById('new_ph_timestamp').value, 'name': document.getElementById('new_ph_name').value, 'url': document.getElementById('new_ph_url').value });\"")
		self.write(">Create new Power Hour</button></div><hr>")

@handle_url("/admin/album_list/producers")
class WebListPowerHours(api.web.PrettyPrintAPIMixin, producers.ListProducers):
	def header_special(self):
		self.write("<th>Time</th><th></th>")

	def row_special(self, row):
		self.write("<td style='font-family: monospace;'>%s</td>" % get_ph_formatted_time(row['start'], row['end'], 'US/Eastern'))
		self.write("<td>Modify</td>")

	def sort_keys(self, keys):
		return [ "name", "type" ]