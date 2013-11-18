'use strict';

var User;

function _on_resize(e) {
    $id('sizable_body').style.height = (window.innerHeight - $id('menu').offsetHeight) + "px";
}

function initialize() {
	User = BOOTSTRAP.json.user;
	API.add_callback(function(json) { User = json; }, "user");

	// Prefs does not need an initialize() - it's loaded with the page
	ErrorHandler.initialize();
	Clock.initialize();
	Schedule.initialize();

	// API comes last since it will do all the callbacks to initialized
	API.initialize(BOOTSTRAP.sid, BOOTSTRAP.api_url, BOOTSTRAP.json.user.user_id, BOOTSTRAP.json.user.api_key, BOOTSTRAP.json);

	_on_resize(null);
	window.addEventListener("resize", _on_resize, false);
};
