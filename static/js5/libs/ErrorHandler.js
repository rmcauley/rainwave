// A lot of code taken from https://bugsnag.com/blog/js-stacktraces/
// and https://raw.githubusercontent.com/bugsnag/bugsnag-js/master/src/bugsnag.js

(function() {
	"use strict";
	var self = {};
	var onerror_handler = function(message, url, lineNo, charNo, exception) {
		// todo
	};

	window.onerror = onerror_handler;
	window.ErrorHandler = self;

	return self;
})();