var User;
var SmallScreen = false;
var SCREEN_HEIGHT;
var SCREEN_WIDTH;
var MAIN_HEIGHT;
var MENU_HEIGHT = 45;
var INITIALIZED = false;

function _size_calculate() {
	"use strict";
	if (MOBILE) return;
	var old_width = SCREEN_WIDTH;
	var old_height = SCREEN_HEIGHT;
	SCREEN_HEIGHT = document.documentElement.clientHeight;
	SCREEN_WIDTH = document.documentElement.clientWidth;
	MAIN_HEIGHT = SCREEN_HEIGHT - MENU_HEIGHT;
	if ((SCREEN_WIDTH <= 1400) && !SmallScreen) {
		SmallScreen = true;
		TimelineSong.calculate_height();
		Fx.delay_draw(function() { $add_class(document.body, "small_screen"); });
		Fx.delay_draw(function() { RatingControl.change_padding_top(1); });
		return true;
	}
	else if ((SCREEN_WIDTH > 1400) && SmallScreen) {
		SmallScreen = false;
		TimelineSong.calculate_height();
		Fx.delay_draw(function() { $remove_class(document.body, "small_screen"); });
		Fx.delay_draw(function() { RatingControl.change_padding_top(3); });
		return true;
	}
	TimelineSong.calculate_height();
	if ($id("playlist_item_height")) {
		PLAYLIST_ITEM_HEIGHT = $id("playlist_item_height").offsetHeight;
	}
	return old_height != SCREEN_HEIGHT || old_width != SCREEN_WIDTH;
}

function _on_resize() {
	// this function causes a 2-paint reflow but the development cost of
	// getting this down to a single reflow would be astronomical in code complexity
	"use strict";
	if (MOBILE) return;

	// paint 1 :(
	if (!_size_calculate()) return;

	// draw 1 :(
	Schedule.reflow_history();
	Fx.flush_draws();
	$id("sizable_body").style.height = MAIN_HEIGHT + "px";

	// paint 2 :(
	Scrollbar.recalculate();
	// scrollbar recalculation has to come before PlaylistLists.on_resize
	PlaylistLists.on_resize();
	Requests.on_resize();
	DetailView.on_resize_calculate();

	// draw 2 :(
	DetailView.on_resize_draw();
	Scrollbar.refresh();

	// hacks, argh, the np size calculate needs to be done after any and all animation
	// has finished, which means we need to introduce this delay.
	//setTimeout(function() { Schedule.now_playing_size_calculate(); }, 1500);
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
			var cta = $el("li", { "id": "request_cta", "class": "link" });
			cta.appendChild($el("span", { "textContent": $l("Request") }));
			$id("top_icons").insertBefore(cta, $id("top_icons").firstChild);
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

function stage_switch(nv, ov) {
	if (MOBILE) {
		$add_class(document.body, "stage_2");
		return;
	}

	if ((nv == 3) && User.perks) {
		Prefs.change("stage", 4);
		return;
	}
	for (var i = 0; i <= 4; i++) {
		$remove_class(document.body, "stage_" + i);
	}
	if ((nv == 4) && ov && (ov < 3)) {
		$id("timeline").style.overflowY = "hidden";
		Fx.chain_transition($id("timeline_scrollblock"), function() {
			$id("timeline").style.overflowY = "";
		});
	}
	vote_cta_check();
	request_cta_check();
	Schedule.stage_padding_check();
	Fx.chain_transition(document.body, function() { $remove_class(document.body, "stage_in_transition"); });
	$add_class(document.body, "stage_" + nv);
	$add_class(document.body, "stage_in_transition");
}

function initialize() {
	"use strict";

	if (INITIALIZED) return;
	INITIALIZED = true;

	// ****************** DATA HANDLING
	TimelineSong.calculate_height();
	Fx.initialize();
	User = BOOTSTRAP.json.user;
	API.add_callback(function(json) { User = json; }, "user");

	Prefs.define("stage", [ 1, 2, 3, 4 ]);
	if (!MOBILE && !User.tuned_in && (Prefs.get("stage") < 2)) {
		API.add_callback(function(json) { vote_cta_check(); }, "user");
	}

	Chart.defaults.global.scaleLineColor = "rgba(255,255,255,0.5)";
	Chart.defaults.global.scaleBeginAtZero = true;
	Chart.defaults.Doughnut.segmentStrokeColor = "#000";
	Chart.defaults.Doughnut.animationEasing = "easeOutQuart";
	Chart.defaults.PolarArea.scaleShowLabels = false;
	Chart.defaults.PolarArea.scaleBackdropColor = "rgba(255,255,255,0.75)";
	Chart.defaults.PolarArea.segmentStrokeColor = "#000";
	Chart.defaults.PolarArea.animationEasing = "easeOutQuart";

	Menu.initialize();
	RatingControl.initialize();
	ErrorHandler.initialize();
	Clock.initialize();
	Schedule.initialize();
	DetailView.initialize();
	PlaylistLists.initialize();
	Requests.initialize();
	R4Audio.initialize(BOOTSTRAP.stream_filename, BOOTSTRAP.relays);
	SettingsWindow.initialize();
	R4Notify.initialize();

	// ****************** PAGE LAYOUT
	// PREP: Applies the small_screen and small_menu classes if necessary and sizes everything
	if (MOBILE) {
		$add_class(document.body, "small_screen mobile_screen");
		SmallScreen = true;
	}
	Fx.flush_draws();
	// copy/pasted from _size_calculate because _size_calculate does not get called and menu height may have changed
	MAIN_HEIGHT = SCREEN_HEIGHT - MENU_HEIGHT;
	$id("sizable_body").style.height = MAIN_HEIGHT + "px";
	PlaylistLists.on_resize(true);

	// PAINT 1: Measure scrollbar width, setup scrollbars
	Scrollbar.calculate_scrollbar_width();
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

	Scrollbar.hold_all_recalculations = true;
	R4Audio.draw();
	Requests.draw();
	Scrollbar.resizer_refresh();
	DetailView.draw();
	PlaylistLists.draw();
	Schedule.draw();
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

	// google analytics
	(function(e,t,n,r,i){function s(t,n){if(n){var r=n.getAttribute("viewBox"),i=e.createDocumentFragment(),s=n.cloneNode(true);if(r){t.setAttribute("viewBox",r)}while(s.childNodes.length){i.appendChild(s.childNodes[0])}t.appendChild(i)}}function o(){var t=this,n=e.createElement("x"),r=t.s;n.innerHTML=t.responseText;t.onload=function(){r.splice(0).map(function(e){s(e[0],n.querySelector("#"+e[1].replace(/(\W)/g,"\\$1")))})};t.onload()}function u(){var i;while(i=t[0]){var a=i.parentNode,f=i.getAttribute("xlink:href").split("#"),l=f[0],c=f[1];a.removeChild(i);if(l.length){var h=r[l]=r[l]||new XMLHttpRequest;if(!h.s){h.s=[];h.open("GET",l);h.onload=o;h.send()}h.s.push([a,c]);if(h.readyState===4){h.onload()}}else{s(a,e.getElementById(c))}}n(u)}if(i){u()}})(document,document.getElementsByTagName("use"),window.requestAnimationFrame||window.setTimeout,{},/Trident\/[567]\b/.test(navigator.userAgent));
}

document.addEventListener("load", initialize);
