var User;

function _on_resize(e) {
	"use strict";
    $id('sizable_body').style.height = (window.innerHeight - $id('menu').offsetHeight) + "px";
    if ((document.documentElement.clientWidth <= 1400) && !($has_class(document.body, "small_screen"))) {
		$add_class(document.body, "small_screen");
		Schedule.reflow();
		RatingControl.change_padding_top(1);
	} 
	else if ((document.documentElement.clientWidth > 1400) && $has_class(document.body, "small_screen")) {
		$remove_class(document.body, "small_screen");
		Schedule.reflow();
		RatingControl.change_padding_top(3);
	}
    Scrollbar.refresh_all_scrollbars();
}

function initialize() {
	"use strict";

	var get_vars = {};
	// http://papermashup.com/read-url-get-variables-withjavascript/
	var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
		get_vars[key] = value;
	});

	_on_resize(null, true);
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

	// API comes last since it will do all the callbacks to initialized
	API.initialize(BOOTSTRAP.sid, BOOTSTRAP.api_url, BOOTSTRAP.json.user.user_id, BOOTSTRAP.json.user.api_key, BOOTSTRAP.json);

	if (("fps" in get_vars) && (get_vars.fps) && ("mozPaintCount" in window)) {
		FPSCounter.initialize();
	}
};
