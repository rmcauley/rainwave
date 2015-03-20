/* deprecated preferences:
	stage
	do_not_update_titlebar
	resizer_playlist
	resizer_timeline
	history_sticky
	resize_*
*/

var User;

(function() {
	"use strict";
	// DOMContentLoaded
	// Process data, prepare templates.
	// NOTHING in here should cause a DOM reflow or change the DOM.
	var template;
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

		for (var i = 0; i < BOOTSTRAP.on_init.length; i++) {
			BOOTSTRAP.on_init[i](template.documentFragment);
		}
	};

	var draw = function() {
		document.body.appendChild(template.documentFragment);
		Scrollbar.calculate_scrollbar_width();
		Sizing.trigger_resize();

		Scrollbar.hold_all_recalculations = true;
		for (var i = 0; i < BOOTSTRAP.on_draw.length; i++) {
			BOOTSTRAP.on_draw[i]();
		}
		Scrollbar.hold_all_recalculations = false;

		Schedule.scroll_init();
		Requests.scroll_init();
		PlaylistLists.scroll_init();
		Scrollbar.resizer_calculate();
		Scrollbar.recalculate();
		DetailView.scroll_init();

		// also measure any elements
		// this particular element measurement is also duplicated in size_calculate
		if ($id("playlist_item_height")) {
			PLAYLIST_ITEM_HEIGHT = $id("playlist_item_height").offsetHeight;
		}

		// DIRTY THE LAYOUT

		if (DeepLinker.has_deep_link() && (Prefs.get("stage") < 3)) {
			Prefs.change("stage", 3);
		}
		stage_switch(Prefs.get("stage"));
		Prefs.add_callback("stage", stage_switch);

		R4Audio.draw();
		Requests.draw();
		Scrollbar.resizer_refresh();
		DetailView.draw();
		PlaylistLists.draw();
		Schedule.draw();
		Menu.draw(BOOTSTRAP.station_list);
		SettingsWindow.draw();
		AboutWindow.draw();
		$remove_class(document.body, "loading");
		Fx.flush_draws();

		// PAINT 2: Scrollbar bullshit
		Scrollbar.hold_all_recalculations = false;
		Schedule.now_playing_size_calculate();
		Scrollbar.recalculate();

		// FINAL DIRTY: Move/size the scrollbars
		Scrollbar.refresh();

		// ****************** DATA CLEANUP
		delete(BOOTSTRAP.json);
		DeepLinker.detect_url_change();

		setTimeout(function() { $remove_class(document.body, "unselectable"); }, 1500);
	};

	document.addEventListener("DOMContentLoaded", initialize);
	document.addEventListener("load", draw);
}());

function attachFastClick() {
	if (document.readyState == "interactive" || document.readyState == "complete") {
		FastClick.attach(document.body);
	}
	else {
		window.addEventListener("load", attachFastClick);
	}
}