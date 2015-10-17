/* deprecated preferences:
	stage
	do_not_update_titlebar
	resizer_playlist
	resizer_timeline
	history_sticky
	resize_*
	station_select_clicked
	show_m3u
	show_artists
	show_losing_songs
*/

/* For page initialization:

BOOTSTRAP.on_init will fill a documentFragment
BOOTSTRAP.on_measure happens after a paint - use this to measure elements without incurring extra reflows
BOOTSTRAP.on_draw happens after the measurement - please do not cause reflows.

*/

var User;
var Stations = [];

(function() {
	"use strict";
	var template;

	var initialize = function() {
		// BOOTSTRAP.station_list = {
		// 	1: { "id": 1, "name": "Game", "url": "hello" },
		// 	2: { "id": 2, "name": "OC ReMix", "url": "hello" },
		// 	3: { "id": 3, "name": "Covers", "url": "hello" },
		// 	4: { "id": 4, "name": "Chiptune", "url": "hello" },
		// 	5: { "id": 5, "name": "All", "url": "hello" }
		// };
		var order = [ 5, 1, 4, 2, 3 ];
		var colors = {
			1: "#1f95e5",  // Rainwave blue
			2: "#de641b",  // OCR Orange
			3: "#b7000f",  // Red
			4: "#6e439d",  // Indigo
			5: "#a8cb2b",  // greenish
		};
		for (var i = 0; i < order.length; i++) {
			if (BOOTSTRAP.station_list[order[i]]) {
				Stations.push(BOOTSTRAP.station_list[order[i]]);
				Stations[Stations.length - 1].name = $l("station_name_" + order[i]);
				if (order[i] == BOOTSTRAP.user.sid) {
					Stations[Stations.length - 1].url = null;
				}
				if (colors[order[i]]) {
					Stations[Stations.length - 1].color = colors[order[i]];
				}
			}
		}
		if (window.location.href.indexOf("beta") !== -1) {
			for (i = 0; i < Stations.length; i++) {
				if (Stations[i].url) Stations[i].url += "/beta";
			}
		}
		BOOTSTRAP.station_list = Stations;

		template = RWTemplates.index({ "stations": Stations });
		User = BOOTSTRAP.user;
		API.add_callback("user", function(json) { User = json; });

		Chart.defaults.global.scaleLineColor = "rgba(255,255,255,0.5)";
		Chart.defaults.global.scaleBeginAtZero = true;
		Chart.defaults.Doughnut.segmentStrokeColor = "#000";
		Chart.defaults.Doughnut.animationEasing = "easeOutQuart";
		Chart.defaults.PolarArea.scaleShowLabels = false;
		Chart.defaults.PolarArea.scaleBackdropColor = "rgba(255,255,255,0.75)";
		Chart.defaults.PolarArea.segmentStrokeColor = "#000";
		Chart.defaults.PolarArea.animationEasing = "easeOutQuart";

		// pre-paint DOM operations while the network is doing its work for CSS
		for (i = 0; i < BOOTSTRAP.on_init.length; i++) {
			BOOTSTRAP.on_init[i](template);
		}
	};

	var draw = function() {
		var i;
		if (User.id > 1) {
			document.body.classList.add("logged_in");
		}
		document.body.appendChild(template._root);

		for (i = 0; i < BOOTSTRAP.on_measure.length; i++) {
			BOOTSTRAP.on_measure[i](template);
		}

		for (i = 0; i < BOOTSTRAP.on_draw.length; i++) {
			BOOTSTRAP.on_draw[i](template);
		}

		Sizing.trigger_resize();

		API.initialize(BOOTSTRAP.sid, "/api4/", BOOTSTRAP.user.id, BOOTSTRAP.user.api_key, BOOTSTRAP);

		document.body.classList.remove("loading");

		// DeepLinker.detect_url_change();

		if (document.ontouchstart === null) {
			var fastclick_load = document.createElement("script");
			fastclick_load.src = "//cdnjs.cloudflare.com/ajax/libs/fastclick/1.0.6/fastclick.min.js";
			fastclick_load.addEventListener("load", function() {
				FastClick.attach(document.body);
			});
			document.body.appendChild(fastclick_load);
		}

		//BOOTSTRAP = null;

		Router.detect_url_change();
	};

	document.addEventListener("DOMContentLoaded", initialize);
	window.addEventListener("load", draw);
}());
