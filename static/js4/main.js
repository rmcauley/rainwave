'use strict';

var User;

function _on_resize(e) {
    $id('sizable_body').style.height = (window.innerHeight - $id('menu').offsetHeight) + "px";
    Scrollbar.refresh_all_scrollbars();
}

function initialize() {
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
	Fx.initialize();
	ErrorHandler.initialize();
	Clock.initialize();
	Schedule.initialize();
	PlaylistLists.initialize();

	// API comes last since it will do all the callbacks to initialized
	API.initialize(BOOTSTRAP.sid, BOOTSTRAP.api_url, BOOTSTRAP.json.user.user_id, BOOTSTRAP.json.user.api_key, BOOTSTRAP.json);

	if (("fps" in get_vars) && (get_vars['fps']) && ("mozPaintCount" in window)) {
		FPSCounter.initialize();
	}
};
