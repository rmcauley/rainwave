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

(function() {
	"use strict";
	var fastclick_attach = function() {
		FastClick.attach(document.body);
	};

	var template;

	var initialize = function() {
		template = RWTemplates.index({ "stations": Menu.stations });
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
		for (var i = 0; i < BOOTSTRAP.on_init.length; i++) {
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
			fastclick_load.src = "//cdnjs.cloudflare.com/ajax/libs/fastclick/1.0.3/fastclick.min.js";
			fastclick_load.addEventListener("load", fastclick_attach);
			document.body.appendChild(fastclick_load);
		}

		//BOOTSTRAP = null;

		Router.detect_url_change();
	};

	document.addEventListener("DOMContentLoaded", initialize);
	window.addEventListener("load", draw);
}());