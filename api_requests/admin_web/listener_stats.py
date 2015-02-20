import datetime
import tornado.escape

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

class ListenerStatsBase(api.web.PrettyPrintAPIMixin):
	def get(self):	#pylint: disable=E0202,W0221
		self.write(self.render_string("bare_header.html", title="Listener Stats"))
		self.write("<script src=\"//cdnjs.cloudflare.com/ajax/libs/Chart.js/1.0.1-beta.2/Chart.min.js\" type=\"application/javascript\"></script>")
		self.write("<script src=\"/static/js4_admin/Chart.StackedBar.js\" type=\"application/javascript\"></script>")
		self.write("<script>\n")
		self.write("window.top.refresh_all_screens = false;")

		data = {}
		data["labels"] = None
		data["datasets"] = []
		for sid, stats in self._output[self.return_name].iteritems():
			if not data["labels"]:
				data["labels"] = []
				for stat in stats:
					data["labels"].append(stat['lc_time'])

			cdata = []
			for stat in stats:
				cdata.append(stats['lc_listeners'])

			data["datasets"].append({
				"label": config.station_id_friendly[sid],
				"fillColor": station_colors[sid],
				"strokeColor": station_colors[sid],
				"highlightFill": station_colors[sid],
				"highlightStroke": station_colors[sid],
				"data": cdata
			})

		self.write("requestAnimationFrame(function() {\n")
		self.write("var data = %s;" % tornado.escape.json_encode(data))
		self.write("\n"
				"var cnvs = document.createElement('canvas');\n"
				"cnvs.setAttribute('width', '800');\n"
				"cnvs.setAttribute('height', '500');\n"
				"document.body.appendChild(cnvs);\n"
				"var chart = new Chart(cnvs.getContext('2d')).StackedBar(data);\n"
			"});"
		)
		self.write("\n</script>")
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/album_list/listener_stats")
class ListenerStats(ListenerStatsBase, listener_stats.ListenerStats):
	pass

@handle_url("/admin/album_list/listener_stats_aggregate")
class ListenerStatsAggregate(ListenerStatsBase, listener_stats.ListenerStatsAggregate):
	pass