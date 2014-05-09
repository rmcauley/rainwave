var User;
var SmallScreen = false;

function _size_calculate() {
	"use strict";
	var screen_size_changed = false;
	if ((document.documentElement.clientWidth <= 1400) && !SmallScreen) {
		$add_class(document.body, "small_screen");
		SmallScreen = true;
		screen_size_changed = true;
		RatingControl.change_padding_top(1);
	}
	else if ((document.documentElement.clientWidth > 1400) && SmallScreen) {
		$remove_class(document.body, "small_screen");
		SmallScreen = false;
		screen_size_changed = true;
		RatingControl.change_padding_top(3);
	}
	return screen_size_changed;
}

function _on_resize() {
	"use strict";
	var screen_size_changed	= _size_calculate();
	var new_height = (window.innerHeight - $id('menu').offsetHeight);
	$id('sizable_body').style.height = new_height + "px";
	TimelineSong.calculate_height();
	PlaylistLists.on_resize(new_height);
	// Scrollbar.refresh_all_scrollbars();
	DetailView.on_resize();
	Requests.on_resize(new_height);
	// this has to go after due to scrollbar funkiness with the schedule
	if (screen_size_changed) {
		Schedule.reflow();
		Requests.reflow();
	}
}

function initialize() {
	"use strict";

	var get_vars = {};
	// http://papermashup.com/read-url-get-variables-withjavascript/
	var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
		get_vars[key] = value;
	});

	_size_calculate();
	window.addEventListener("resize", _on_resize, false);

	User = BOOTSTRAP.json.user;
	API.add_callback(function(json) { User = json; }, "user");

	// Prefs does not need an initialize() - it's loaded with the page
	RatingControl.initialize();
	Fx.initialize();
	ErrorHandler.initialize();
	Clock.initialize();
	Schedule.initialize();
	PlaylistLists.initialize();
	DetailView.initialize();
	Requests.initialize();
	R4Audio.initialize(BOOTSTRAP.stream_filename, BOOTSTRAP.relays);
	Menu.initialize(BOOTSTRAP.station_list);
	_on_resize();

	// API comes last since it will do all the callbacks to initialized
	API.initialize(BOOTSTRAP.sid, BOOTSTRAP.api_url, BOOTSTRAP.json.user.id, BOOTSTRAP.json.user.api_key, BOOTSTRAP.json);
	delete(BOOTSTRAP.json);

	if (("fps" in get_vars) && (get_vars.fps) && ("mozPaintCount" in window)) {
		FPSCounter.initialize();
	}

	DeepLinker.detect_url_change();
};
