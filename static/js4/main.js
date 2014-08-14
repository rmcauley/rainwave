// attribution to do:
// sort design icon by http://www.thenounproject.com/NemanjaIvanovic

var User;
var SmallScreen = false;
var SCREEN_HEIGHT;
var SCREEN_WIDTH;
var MAIN_HEIGHT;
var MENU_HEIGHT = 56;

function _size_calculate() {
	"use strict";
	var old_height = SCREEN_HEIGHT;
	SCREEN_HEIGHT = document.documentElement.clientHeight;
	SCREEN_WIDTH = document.documentElement.clientWidth;
	MAIN_HEIGHT = SCREEN_HEIGHT - MENU_HEIGHT;
	if ((SCREEN_WIDTH <= 1400) && !SmallScreen) {
		SmallScreen = true;
		Fx.delay_draw(function() { $add_class(document.body, "small_screen") });
		Fx.delay_draw(function() { RatingControl.change_padding_top(1); });
		return true;
	}
	else if ((SCREEN_WIDTH > 1400) && SmallScreen) {
		SmallScreen = false;
		Fx.delay_draw(function() { $remove_class(document.body, "small_screen") });
		Fx.delay_draw(function() { RatingControl.change_padding_top(3); });
		return true;
	}
	return old_height != SCREEN_HEIGHT;
}

function _on_resize() {
	// this function causes a 2-paint reflow but the development cost of
	// getting this down to a single reflow would be astronomical in code complexity
	"use strict";
	// paint 1 :(
	if (!_size_calculate()) return;
	
	// draw 1 :(
	Fx.flush_draws();
	$id('sizable_body').style.height = MAIN_HEIGHT + "px";

	// paint 2 :(
	Schedule.scrollbar_recalculate();
	Scrollbar.recalculate();
	DetailView.on_resize_calculate();
	// scrollbar recalculation has to come before PlaylistLists.on_resize
	PlaylistLists.on_resize();
	Requests.on_resize();

	// draw 2 :(
	DetailView.on_resize_draw();
	Scrollbar.refresh();

	// hacks, argh, the np size calculate needs to be done after any and all animation
	// has finished, which means we need to introduce this delay.
	setTimeout(function() { Schedule.now_playing_size_calculate(); }, 1500);
}

function vote_cta_check() {
	if ((User.tuned_in) && (Prefs.get("stage") < 2)) {
		if (!$id("vote_cta")) {
			var cta = $el("div", { "id": "vote_cta", "textContent": $l("click_here_to_start_voting") });
			cta.addEventListener("click", function() {
				Prefs.change("stage", 2);
				Fx.remove_element(cta);
			});
			document.body.appendChild(cta);
			Fx.delay_css_setting(cta, "opacity", 1);
		}
	}
	else if ($id("vote_cta")) {
		$id("vote_cta").parentNode.removeChild($id("vote_cta"));
	}
}

function request_cta_check() {
	if ((User.id > 1) && (Prefs.get("stage") == 2)) {
		if (!$id("request_cta")) {
			var cta = $el("li", { "id": "request_cta" });
			cta.appendChild($el("img", { "src": "/static/images4/request.png" }));
			cta.appendChild($el("span", { "textContent": $l("request_song_to_vote_for") }));
			$id("main_icons").insertBefore(cta, $id("main_icons").firstChild);
			cta.addEventListener("click", function() {
				Prefs.change("stage", 3);
				Fx.remove_element(cta);
				PlaylistLists.intro_mode_first_open();
			});
			Fx.delay_css_setting(cta, "opacity", 1);
		}
	}
	else if ($id("request_cta")) {
		$id("request_cta").parentNode.removeChild($id("request_cta"));
	}
}

function stage_switch(nv) { 
	if ((nv == 3) && User.perks) {
		Prefs.change("stage", 4);
		return;
	}
	for (var i = 0; i <= 4; i++) {
		$remove_class(document.body, "stage_" + i);
	}
	$add_class(document.body, "stage_" + nv);
	vote_cta_check();
	request_cta_check();
	Schedule.stage_padding_check();
}

function initialize() {
	"use strict";

	// ****************** DATA HANDLING
	User = BOOTSTRAP.json.user;
	API.add_callback(function(json) { User = json; }, "user");

	Prefs.define("stage", [ 1, 2, 3, 4 ]);
	if (!User.tuned_in && (Prefs.get("stage") < 2)) {
		API.add_callback(function(json) { vote_cta_check(); }, "user");
	}

	Menu.initialize();
	RatingControl.initialize();
	ErrorHandler.initialize();
	Clock.initialize();
	Schedule.initialize();
	DetailView.initialize();
	PlaylistLists.initialize();
	Requests.initialize();
	R4Audio.initialize(BOOTSTRAP.stream_filename, BOOTSTRAP.relays);
	History.initialize();
	SettingsWindow.initialize();

	// ****************** PAGE LAYOUT
	// PREP: Applies the small_screen and small_menu classes if necessary and sizes everything
	Fx.flush_draws();
	// copy/pasted from _size_calculate because _size_calculate does not get called and menu height may have changed
	MAIN_HEIGHT = SCREEN_HEIGHT - MENU_HEIGHT;
	$id('sizable_body').style.height = MAIN_HEIGHT + "px";
	PlaylistLists.on_resize(true);

	// PAINT 1: Measure scrollbar width, setup scrollbars
	Scrollbar.calculate_scrollbar_width();
	Schedule.scroll_init();
	Requests.scroll_init();
	PlaylistLists.scroll_init();
	Scrollbar.resizer_calculate();
	Scrollbar.recalculate();
	DetailView.scroll_init();
	History.scroll_init();

	// DIRTY THE LAYOUT

	if (DeepLinker.has_deep_link() && (Prefs.get("stage") < 3)) {
		Prefs.change("stage", 3);
	}
	stage_switch(Prefs.get("stage"));
	Prefs.add_callback("stage", stage_switch);

	Scrollbar.hold_all_recalculations = true;
	R4Audio.draw();
	Requests.draw();
	Scrollbar.resizer_refresh();
	DetailView.draw();
	PlaylistLists.draw();
	History.draw();
	Menu.draw(BOOTSTRAP.station_list);
	SettingsWindow.draw();
	AboutWindow.draw();
	API.initialize(BOOTSTRAP.sid, BOOTSTRAP.api_url, BOOTSTRAP.json.user.id, BOOTSTRAP.json.user.api_key, BOOTSTRAP.json);
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
	window.addEventListener("resize", _on_resize, false);
	setTimeout(function() { $remove_class(document.body, "unselectable"); }, 1500);
};
