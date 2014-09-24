from libs import config
import api.web
from api import fieldtypes
from api.server import handle_url
from api_requests.admin import producers
from rainwave.events import event
from api_requests.admin_web import index
from api_requests.admin_web.power_hours import get_ph_formatted_time

# this makes sure all the event modules get loaded correctly
# DO NOT REMOVE despite what pylinter might tell you!
from rainwave import schedule

@handle_url("/admin/tools/producers")
class WebCreateProducer(api.web.HTMLRequest):
	admin_required = True
	sid_required = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="%s Create Producer" % config.station_id_friendly[self.sid]))
		self.write("<h2>%s: Create Producer</h2>" % config.station_id_friendly[self.sid])
		self.write("<script>\nwindow.top.refresh_all_screens = true;\n</script>")

		# it says 'ph' because I super-lazily copy/pasted this from the power hour creator code
		self.write("<div>Type: <select id='new_ph_type'/>")
		for producer_type in event.get_admin_creatable_producers():
			self.write("<option value='%s'>%s</option>" % (producer_type, producer_type))
		self.write("</select><br>")
		self.write("Name: <input id='new_ph_name' type='text' /><br>")
		self.write("URL: <input id='new_ph_url' type='text' /><br><br>Input date and time in YOUR timezone.<br><u>Start Time</u>:<br> ")
		index.write_html_time_form(self, "new_ph_start")
		self.write("<br><br><u>End Time</u>:<br> ")
		index.write_html_time_form(self, "new_ph_end")
		self.write("<br><br><button onclick=\"window.top.call_api('admin/create_producer', ")
		self.write("{ 'producer_type': document.getElementById('new_ph_type').value, 'end_utc_time': document.getElementById('new_ph_end_timestamp').value, 'start_utc_time': document.getElementById('new_ph_start_timestamp').value, 'name': document.getElementById('new_ph_name').value, 'url': document.getElementById('new_ph_url').value });\"")
		self.write(">Create new Producer</button></div>")
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/album_list/producers")
class WebListProducers(api.web.PrettyPrintAPIMixin, producers.ListProducers):
	def header_special(self):
		self.write("<th>Time</th><th></th><th></th>")

	def row_special(self, row):
		self.write("<td style='font-family: monospace;'>%s</td>" % get_ph_formatted_time(row['start'], row['end'], 'US/Eastern'))
		self.write("<td><a href='/admin/album_list/modify_producer?sid=%s&sched_id=%s'>Modify</a></td>" % (self.sid, row['id']))
		self.write("<td><a onclick=\"window.top.call_api('admin/delete_producer', { 'sched_id': %s });\">Delete</a></td>" % row['id'])

	def sort_keys(self, keys):
		return [ "name", "type", "url", 'sid', 'sched_length_minutes' ]

@handle_url("/admin/album_list/modify_producer")
class WebModifyProducer(api.web.HTMLRequest):
	admin_required = True
	sid_required = True
	fields = { "sched_id": (fieldtypes.sched_id, True) }

	def get(self):
		p = event.BaseProducer.load_producer_by_id(self.get_argument("sched_id"))
		self.write(self.render_string("bare_header.html", title="%s" % p.name))
		self.write("<h2>%s %s - %s</h2>" % (config.station_id_friendly[self.sid], p.type, p.name))
		self.write("<script>\nwindow.top.refresh_all_screens = true;\n</script>")

		self.write("Name: <input id='new_ph_name' type='text' value=\"%s\"/><br>" % p.name)
		self.write("<button onclick=\"window.top.call_api('admin/change_producer_name', { 'sched_id': %s, 'name': document.getElementById('new_ph_name').value });\">Change Name</button><br><hr>" % p.id)
		self.write("URL: <input id='new_ph_url' type='text' value=\"%s\"/><br>" % (p.url or ""))
		self.write("<button onclick=\"window.top.call_api('admin/change_producer_url', { 'sched_id': %s, 'url': document.getElementById('new_ph_url').value });\">Change URL</button><br><hr>" % p.id)
		self.write("<div>Input date and time in YOUR timezone.<br><br><u>Start Time</u>:<br> ")
		index.write_html_time_form(self, "new_ph_start", p.start)
		self.write("<br><button onclick=\"window.top.call_api('admin/change_producer_start_time', { 'sched_id': %s, 'utc_time': document.getElementById('new_ph_start_timestamp').value });\">Change Start Time</button><br><hr>" % p.id)
		self.write("<u>End Time</u>:<br> ")
		index.write_html_time_form(self, "new_ph_end", p.end)
		self.write("<br><button onclick=\"window.top.call_api('admin/change_producer_end_time', { 'sched_id': %s, 'utc_time': document.getElementById('new_ph_end_timestamp').value });\">Change End Time</button><br><hr>" % p.id)
		self.write(self.render_string("basic_footer.html"))