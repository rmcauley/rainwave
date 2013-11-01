'use strict';

function initialize() {
	// Prefs does not need an initialize() - it's loaded with the page
	API.initialize(BOOTSTRAP.sid, BOOTSTRAP.api_url, BOOTSTRAP.json.user.id, BOOTSTRAP.json.user.api_key, BOOTSTRAP.json);
	ErrorHandler.initialize();
	Clock.initialize();

	delete BOOTSTRAP;
};
