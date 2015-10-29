import time
import calendar
from libs import config
from libs import db
from libs import cache
import api.web
from api.server import handle_url
from api import fieldtypes
import api_requests.playlist

def write_html_time_form(request, html_id, at_time = None):
	current_time = calendar.timegm(time.gmtime())
	if not at_time:
		at_time = current_time
	request.write(request.render_string("admin_time_select.html", at_time=at_time, html_id=html_id))

@handle_url("/admin/")
class AdminIndex(api.web.HTMLRequest):
	admin_required = True

	def get(self):
		self.render("admin_frame.html",
			title="Rainwave Admin",
			api_url=config.get("api_external_url_prefix"),
			user_id=self.user.id,
			api_key=self.user.ensure_api_key(),
			sid=self.sid,
			tool_list_url="tool_list",
			station_list_url="station_list")

@handle_url("/admin/dj")
class DJIndex(api.web.HTMLRequest):
	dj_preparation = True

	def get(self):
		self.render("admin_frame.html",
			title="Rainwave DJ",
			api_url=config.get("api_external_url_prefix"),
			user_id=self.user.id,
			api_key=self.user.ensure_api_key(),
			sid=self.sid,
			tool_list_url="dj_election_list",
			station_list_url="dj_tools")

@handle_url("/admin/tool_list")
class ToolList(api.web.HTMLRequest):
	admin_required = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="Tool List"))
		self.write("<b>Do:</b><br />")
		# [ ( "Link Title", "admin_url" ) ]
		for item in [ ("Scan Results", "scan_results"), ("Producers", "producers"), ("Producers (Meta)", "producers_all"), ("Power Hours", "power_hours"), ("DJ Elections", "dj_election"), ("Cooldown", "cooldown"), ("Request Only Songs", "song_request_only"), ("Donations", "donations"), ("Associate Groups", "associate_groups"), ("Disassociate Groups", "disassociate_groups"), ("Edit Groups", "group_edit"), ("Listener Count", "listener_stats"), ("Listener Count [Wkly]", "listener_stats_aggregate"), ("JS Errors", "js_errors") ]:
			self.write("<a style='display: block' id=\"%s\" href=\"#\" onclick=\"window.top.current_tool = '%s'; window.top.change_screen();\">%s</a>" % (item[1], item[1], item[0]))
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/station_list")
class StationList(api.web.HTMLRequest):
	admin_required = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="Station List"))
		self.write("<b>On station:</b><br>")
		for sid in config.station_ids:
			self.write("<a style='display: block' id=\"sid_%s\" href=\"#\" onclick=\"window.top.current_station = %s; window.top.change_screen();\">%s</a>" % (sid, sid, config.station_id_friendly[sid]))
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/restrict_songs")
class RestrictList(api.web.HTMLRequest):
	dj_preparation = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="Station List"))
		self.write("<b>With songs from:</b><br>")
		for sid in config.station_ids:
			self.write("<a style='display: block' id=\"sid_%s\" href=\"#\" onclick=\"window.top.current_restriction = %s; window.top.change_screen();\">%s</a>" % (sid, sid, config.station_id_friendly[sid]))
		self.write("<a style='display: block' id=\"sid_%s\" href=\"#\" onclick=\"window.top.current_restriction = %s; window.top.change_screen();\">%s</a>" % (0, 0, "DJ Only"))
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/dj_election_list")
class DJEventList(api.web.HTMLRequest):
	dj_preparation = True

	def get(self):
		evts = db.c.fetch_all("SELECT * FROM r4_schedule WHERE sched_dj_user_id = %s AND sched_used = FALSE", (self.user.id,))
		self.write(self.render_string("bare_header.html", title="Event List"))
		if not len(evts):
			self.write("<div>You have no upcoming events.</div>")
		for row in evts:
			self.write("<div><a href=\"#\" onclick=\"window.top.dj_election_sched_id = %s; window.top.current_tool = 'dj_election'; window.top.change_screen();\">%s (%s)</div>" % (row['sched_id'], row['sched_name'], config.station_id_friendly[row['sid']]))
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/dj_tools")
class DJTools(api.web.HTMLRequest):
	dj_required = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="DJ Tools"))
		self.write("<div style='margin-bottom: 0.5em; font-weight: bold; border-bottom: solid 1px #777;'>%s - " % config.station_id_friendly[self.sid])
		if cache.get_station(self.sid, "backend_paused"):
			self.write("<span style='color: #6F6;'>Paused</span> ")
			if cache.get_station(self.sid, "backend_paused_playing"):
				self.write("<span style='color: #6F6; float: right;'>No Music</span>")
				if cache.get_station(self.sid, "backend_pause_extend"):
					self.write("<span style='color: #F00;'>(Will End)</span>")
				else:
					self.write("<span style='color: #6F6;'>(Extended)</span>")
			else:
				self.write("<span style='color: #FF0; float: right;'>Waiting</span>")
		else:
			self.write("Normal")
		self.write("</div>")
		self.write("<div style='margin-bottom: 0.5em;'><a onclick=\"window.top.call_api('admin/dj/pause'); setTimeout(function() { window.location.reload(); }, 1000);\">Pause %s At End Of Song</a></div>" % config.station_id_friendly[self.sid])
		self.write("<div style='margin-bottom: 0.5em;'><a onclick=\"window.top.call_api('admin/dj/unpause'); setTimeout(function() { window.location.reload(); }, 1000);\">Start %s</a></div>" % config.station_id_friendly[self.sid])
		self.write("<div style='margin-bottom: 0.5em;'><a onclick=\"window.top.call_api('admin/dj/unpause?kick_dj=true'); setTimeout(function() { window.location.reload(); }, 1000);\">Disconnect And/Or Start %s</a></div>" % config.station_id_friendly[self.sid])
		self.write("<div style='margin-bottom: 0.5em;'><a onclick=\"window.top.call_api('admin/dj/skip');\">Skip song (use if station is broken)</a></div>")
		self.write("<div>Stream ID3 Title While Paused:<br> <input type='text' id='pause_title' value=\"%s\" />" % (cache.get_station(self.sid, "pause_title") or "",))
		self.write(		"<button onclick=\"window.top.call_api('admin/dj/pause_title', { 'title': document.getElementById('pause_title').value });\" />Save</button>")
		self.write("</div>")
		self.write(self.render_string("basic_footer.html"))


@handle_url("/admin/relay_status")
class RelayStatus(api.web.HTMLRequest):
	dj_required = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="Relay Status"))
		status = cache.get("relay_status")
		self.write("<div style='float: right'>")
		if status:
			for relay, count in status.iteritems():
				self.write("%s: %s listeners<br />" % (relay, count))
		else:
			self.write("No relay status available.")
		self.write("</div>")
		self.write("<div>")
		total = 0
		for row in db.c.fetch_all("SELECT sid, lc_guests AS c FROM r4_listener_counts ORDER BY lc_time DESC, sid LIMIT %s", (len(config.station_ids),)):
			total += row['c']
			self.write("%s: %s listeners<br />" % (config.station_id_friendly[row['sid']], row['c']))
		if total == 0:
			self.write("No listener stats available.")
		else:
			self.write("<br />")
			self.write("<b>Total: %s listeners</b>" % total)
		self.write("</div>")
		self.write(self.render_string("basic_footer.html"))

class AlbumList(api.web.HTMLRequest):
	admin_required = True
	allow_get = True
	allow_sid_zero = True
	fields = { "restrict": (fieldtypes.sid, True) }

	def get(self):
		self.write(self.render_string("bare_header.html", title="Album List"))
		self.write("<h2>%s Playlist</h2>" % config.station_id_friendly[self.get_argument('restrict')])
		self.write("<table>")
		albums = db.c.fetch_all("SELECT r4_albums.album_id AS id, album_name AS name, album_name_searchable AS name_searchable, album_rating AS rating, album_cool AS cool, album_cool_lowest AS cool_lowest, album_updated AS updated, album_fave AS fave, album_rating_user AS rating_user, album_cool_multiply AS cool_multiply, album_cool_override AS cool_override "
			"FROM r4_albums "
			"JOIN r4_album_sid USING (album_id) "
			"LEFT JOIN r4_album_ratings ON (r4_album_sid.album_id = r4_album_ratings.album_id AND user_id = %s AND r4_album_ratings.sid = r4_album_sid.sid) "
			"WHERE r4_album_sid.sid = %s AND r4_album_sid.album_exists = TRUE "
			"ORDER BY album_name",
			(self.user.id, self.get_argument("restrict")))
		for row in albums:
			self.write("<tr><td>%s</td>" % row['id'])
			self.write("<td onclick=\"window.location.href = '../song_list/' + window.top.current_tool + '?sid=%s&id=%s';\" style='cursor: pointer;'>%s</td><td>" % (self.get_argument('restrict'), row['id'], row['name']))
			if row['rating_user']:
				self.write(str(row['rating_user']))
			self.write("</td><td>(%s)</td><td>" % row['rating'])
			if row['fave']:
				self.write("Fave")
			self.write("</td>")
			self.render_row_special(row)
			self.write("</tr>")
		self.write(self.render_string("basic_footer.html"))

	def render_row_special(self, row):
		pass

class SongList(api.web.PrettyPrintAPIMixin, api_requests.playlist.AlbumHandler):
	admin_required = True
	allow_sid_zero = True
	# fields are handled by AlbumHandler

	def get(self):	#pylint: disable=E0202,W0221
		self.write(self.render_string("bare_header.html", title="Song List"))
		self.write("<h2>%s (%s)</h2>" % (self._output['album']['name'], config.station_id_friendly[self.sid]))
		self.write("<table>")
		for row in self._output['album']['songs']:
			self.write("<tr><td>%s</th><td>%s</td><td>" % (row['id'], row['title']))
			if row['rating_user']:
				self.write(str(row['rating_user']))
			self.write("</td><td>(%s)</td><td>" % row['rating'])
			if row['fave']:
				self.write("Fave")
			self.write("</td>")
			self.render_row_special(row)
			self.write("</tr>")
		self.write(self.render_string("basic_footer.html"))

	def render_row_special(self, row):
		pass

