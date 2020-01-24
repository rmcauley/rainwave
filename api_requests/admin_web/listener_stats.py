try:
	import ujson as json
except ImportError:
	import json

import datetime

from libs import config
import api.web
from api.server import handle_url

from api_requests.admin import listener_stats

@handle_url("/admin/tools/listener_stats")
@handle_url("/admin/tools/listener_stats_aggregate")
class BlankPage(api.web.HTMLRequest):
	admin_required = True

	def get(self):	#pylint: disable=E0202,W0221
		self.write(self.render_string("bare_header.html", title="Blank Page"))
		self.write(self.render_string("basic_footer.html"))

station_colors = {
	1: "#1f95e5",
	2: "#de641b",
	3: "#b7000f",
	4: "#6e439d",
	5: "#a8cb2b"
}

#pylint: disable=E1101
class ListenerStatsBase(api.web.PrettyPrintAPIMixin):
	def get(self):	#pylint: disable=E0202,W0221
		self.write(self.render_string("bare_header.html", title="Listener Stats"))
		self.write("<style type='text/css'>span.indicator { display: inline-block; height: 1em; width: 1em; margin-right: 5px; margin-left: 1em; }</style>")
		self.write("<script src=\"//cdnjs.cloudflare.com/ajax/libs/Chart.js/1.0.1/Chart.min.js\" type=\"application/javascript\"></script>")
		self.write("<script src=\"/static/js4_admin/Chart.StackedBar.js\" type=\"application/javascript\"></script>")
		self.write("<script>\n")
		self.write("window.top.refresh_all_screens = false;")

		data = {}
		data["labels"] = None
		data["datasets"] = []
		for sid, stats in self._output[self.return_name].items():
			if not data["labels"]:
				data["labels"] = []
				for stat in stats:
					data["labels"].append(stat['lc_time'])

			cdata = []
			for stat in stats:
				cdata.append(float(stat['lc_listeners']))

			data["datasets"].append({
				"label": config.station_id_friendly[sid],
				"fillColor": station_colors[sid],
				"strokeColor": station_colors[sid],
				"highlightFill": station_colors[sid],
				"highlightStroke": station_colors[sid],
				"data": cdata
			})

		self.write("requestAnimationFrame(function() {\n")
		self.write("var data = %s;" % json.dumps(data, ensure_ascii=False))
		self.write("\n"
				"var cnvs = document.createElement('canvas');\n"
				"cnvs.setAttribute('width', '800');\n"
				"cnvs.setAttribute('height', '500');\n"
				"document.body.appendChild(cnvs);\n"
				"var chart = new Chart(cnvs.getContext('2d')).StackedBar(data, { 'scaleLineColor': 'rgba(255,255,255,0.5)', 'showTooltips': true, 'multiTooltipTemplate': '<%= datasetLabel %>: <%= value %>' });\n"
			"});\n"
			"var load_new = function() { \n"
				"var date_start = document.getElementById('date_start_year').value + '-' + document.getElementById('date_start_month').value + '-' + document.getElementById('date_start_day').value;\n"
				"var date_end = document.getElementById('date_end_year').value + '-' + document.getElementById('date_end_month').value + '-' + document.getElementById('date_end_day').value;\n"
				"window.location.href = '?date_start=' + date_start + '&date_end=' + date_end;\n"
			"};"
		)
		self.write("\n</script>")

		self.write("<h2>")
		self.write(self.header_text)
		self.write(": ")
		self.write(datetime.datetime.fromtimestamp(self.date_start).strftime("%Y-%m-%d %H:%M"))
		self.write(" - ")
		self.write(datetime.datetime.fromtimestamp(self.date_end).strftime("%Y-%m-%d %H:%M"))
		self.write("</h2>")
		self.write("<div style='width: 800px; text-align: center;'>")
		self.write("<select id='date_start_year'>")
		dt_start = self.get_argument("date_start") or (datetime.datetime.now() - datetime.timedelta(weeks=1))
		dt_end = self.get_argument("date_end") or datetime.datetime.now()
		for i in range(2015, datetime.datetime.now().year + 1):
			self.write("<option value='%s' %s>%s</option>" % ("{:0>4d}".format(i), "selected='selected'" if i == dt_start.year else "", i))
		self.write("</select>")
		self.write("<select id='date_start_month'>")
		for i in range(1, 13):
			self.write("<option value='%s' %s>%s</option>" % ("{:0>2d}".format(i), "selected='selected'" if i == dt_start.month else "", i))
		self.write("</select>")
		self.write("<select id='date_start_day'>")
		for i in range(1, 32):
			self.write("<option value='%s' %s>%s</option>" % ("{:0>2d}".format(i), "selected='selected'" if i == dt_start.day else "", i))
		self.write("</select>")
		self.write(" to ")
		self.write("<select id='date_end_year'>")
		for i in range(2015, datetime.datetime.now().year + 1):
			self.write("<option value='%s' %s>%s</option>" % ("{:0>4d}".format(i), "selected='selected'" if i == dt_end.year else "", i))
		self.write("</select>")
		self.write("<select id='date_end_month'>")
		for i in range(1, 13):
			self.write("<option value='%s' %s>%s</option>" % ("{:0>2d}".format(i), "selected='selected'" if i == dt_end.month else "", i))
		self.write("</select>")
		self.write("<select id='date_end_day'>")
		for i in range(1, 32):
			self.write("<option value='%s' %s>%s</option>" % ("{:0>2d}".format(i), "selected='selected'" if i == dt_end.day else "", i))
		self.write("</select></div><br />")
		self.write("<div style='width: 800px; text-align: center;'>")
		for sid in config.station_ids:
			self.write("<span class='indicator' style='background-color: %s'></span> %s" % (station_colors[sid], config.station_id_friendly[sid]))
		self.write("<button onclick='load_new();'>Load</button>")
		self.write("</div>")


		self.write(self.render_string("basic_footer.html"))
#pylint: enable=E1101

@handle_url("/admin/album_list/listener_stats")
class ListenerStats(ListenerStatsBase, listener_stats.ListenerStats):
	header_text = "Listener Counts"

@handle_url("/admin/album_list/listener_stats_aggregate")
class ListenerStatsAggregate(ListenerStatsBase, listener_stats.ListenerStatsAggregate):
	header_text = "Listener Counts By Hour"
