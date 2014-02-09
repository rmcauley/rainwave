var User;
var SmallScreen = false;

function _on_resize(e) {
	"use strict";
	var new_height = (window.innerHeight - $id('menu').offsetHeight);
	$id('sizable_body').style.height = new_height + "px";
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
	TimelineSong.calculate_height();
	PlaylistLists.on_resize();
	Scrollbar.refresh_all_scrollbars();
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

	_on_resize(null);
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

	// API comes last since it will do all the callbacks to initialized
	API.initialize(BOOTSTRAP.sid, BOOTSTRAP.api_url, BOOTSTRAP.json.user.user_id, BOOTSTRAP.json.user.api_key, BOOTSTRAP.json);

	if (("fps" in get_vars) && (get_vars.fps) && ("mozPaintCount" in window)) {
		FPSCounter.initialize();
	}

	DeepLinker.detect_url_change();
};
