'use strict';

function _on_resize(e) {
    $id('sizable_body').style.height = (window.innerHeight - $id('menu').offsetHeight) + "px";
}

function initialize() {
	// Prefs does not need an initialize() - it's loaded with the page
	ErrorHandler.initialize();
	Clock.initialize();
	Schedule.initialize();
	// API comes last since it will do all the callbacks to initialized
	API.initialize(BOOTSTRAP.sid, BOOTSTRAP.api_url, BOOTSTRAP.json.user.id, BOOTSTRAP.json.user.api_key, BOOTSTRAP.json);

	_on_resize(null);
	document.body.addEventListener("resize", _on_resize);
};
