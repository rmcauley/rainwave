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
		if (Prefs.get("adv")) {
			template = RWTemplates.index_advanced();
		}
		else {
			template = RWTemplates.index_basic();
		}

		User = BOOTSTRAP.user;
		API.add_callback(function(json) { User = json; }, "user");

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
		if (Prefs.get("adv")) {
			document.body.classList.add("advanced");
		}
		else {
			document.body.classList.add("basic");
		}
		document.body.appendChild(template._root);

		for (i = 0; i < BOOTSTRAP.on_measure.length; i++) {
			BOOTSTRAP.on_measure[i]();
		}

		Sizing.trigger_resize();

		for (i = 0; i < BOOTSTRAP.on_draw.length; i++) {
			BOOTSTRAP.on_draw[i]();
		}

		API.initialize(BOOTSTRAP.sid, "/api4/", BOOTSTRAP.user.id, BOOTSTRAP.user.api_key, BOOTSTRAP);

		// DeepLinker.detect_url_change();

		if (document.ontouchstart === null) {
			var fastclick_load = document.createElement("script");
			fastclick_load.src = "//cdnjs.cloudflare.com/ajax/libs/fastclick/1.0.3/fastclick.min.js";
			fastclick_load.addEventListener("load", fastclick_attach);
			document.body.appendChild(fastclick_load);
		}

		BOOTSTRAP = null;
	};

	document.addEventListener("DOMContentLoaded", initialize);
	window.addEventListener("load", draw);
}());