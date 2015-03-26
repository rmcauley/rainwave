/* deprecated preferences:
	stage
	do_not_update_titlebar
	resizer_playlist
	resizer_timeline
	history_sticky
	resize_*
	station_select_clicked
	show_m3u
*/

/* For page initialization:

BOOTSTRAP.on_init will fill a documentFragment
BOOTSTRAP.on_measure happens after a paint - use this to measure elements without incurring extra reflows
BOOTSTRAP.on_draw happens after the measurement - please do not cause reflows.

*/

var User;

(function() {
	"use strict";
	var template;

	var fastclick_attach = function() {
		FastClick.attach(document.body);
	};

	var initialize = function() {
		User = BOOTSTRAP.json.user;
		API.initialize(BOOTSTRAP.sid, BOOTSTRAP.api_url, BOOTSTRAP.json.user.id, BOOTSTRAP.json.user.api_key, BOOTSTRAP.json);
		API.add_callback(function(json) { User = json; }, "user");

		Chart.defaults.global.scaleLineColor = "rgba(255,255,255,0.5)";
		Chart.defaults.global.scaleBeginAtZero = true;
		Chart.defaults.Doughnut.segmentStrokeColor = "#000";
		Chart.defaults.Doughnut.animationEasing = "easeOutQuart";
		Chart.defaults.PolarArea.scaleShowLabels = false;
		Chart.defaults.PolarArea.scaleBackdropColor = "rgba(255,255,255,0.75)";
		Chart.defaults.PolarArea.segmentStrokeColor = "#000";
		Chart.defaults.PolarArea.animationEasing = "easeOutQuart";

		if (Prefs.get("full")) {
			template = RWTemplates.index_panels();
		}
		else {
			template = RWTemplates.index_tabs();
		}
		Sizing.sizeable_area = template.sizeable_area;
		Sizing.measure_area = template.measure_area;

		// pre-paint DOM operations while the network is doing its work for CSS
		for (var i = 0; i < BOOTSTRAP.on_init.length; i++) {
			BOOTSTRAP.on_init[i](template.documentFragment);
		}
	};

	var draw = function() {
		document.body.appendChild(template.documentFragment);
		Scrollbar.calculate_scrollbar_width();
		Sizing.trigger_resize();

		Scrollbar.hold_all_recalculations = true;
		for (var i = 0; i < BOOTSTRAP.on_measure.length; i++) {
			BOOTSTRAP.on_measure[i]();
		}
		Scrollbar.hold_all_recalculations = false;

		for (i = 0; i < BOOTSTRAP.on_draw.length; i++) {
			BOOTSTRAP.on_draw[i]();
		}

		//DeepLinker.detect_url_change();

		if (document.ontouchstart === null) {
			var fastclick_load = document.createElement("script");
			fastclick_load.src = "//cdnjs.cloudflare.com/ajax/libs/fastclick/1.0.3/fastclick.min.js";
			fastclick.addEventListener("load", fastclick_attach);
			document.body.appendChild(fastclick);
		}
	};

	document.addEventListener("DOMContentLoaded", initialize);
	document.addEventListener("load", draw);
}());