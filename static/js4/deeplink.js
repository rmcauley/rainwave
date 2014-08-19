var DeepLinker = function() {
	"use strict";

	var self = {};
	var old_url;
	var routes = {};

	self.register_route = function(route, callback) {
		routes[route] = callback;
	};

	self.has_deep_link = function() {
		var deeplinkurl = decodeURI(location.href);
		return (deeplinkurl.indexOf("#!/") >= 0);
	};

	self.detect_url_change = function() {
		if (old_url != location.href) {
			var deeplinkurl = decodeURI(location.href);
			if (deeplinkurl.indexOf("#!/") >= 0) {
				var args = deeplinkurl.substring(deeplinkurl.indexOf("#!/") + 3).split("/");
				var r = args.splice(0, 1)[0];
				self.open_route(r, args);
			}
			old_url = location.href;
		}
	};

	self.open_route = function(route, args) {
		if (route in routes) {
			if (!routes[route].apply(this, args)) {
				ErrorHandler.permanent_error(ErrorHandler.make_error("deeplink_error", 404))
			}
			if (Prefs.get("stage") < 3) {
				Prefs.change("stage", 3);
			}
		}
	};

	self.change_url = function(route, args) {
		// I don't like putting this here as it's a bit of a hack, and it really should *only* belong
		// in open route, but there are corner cases where someone may click the same URL to
		// open an album if they're going between intro and full modes
		if (Prefs.get("stage") < 3) {
			Prefs.change("stage", 3);
		}
		var r = route + "/";
		for (var i = 1; i < arguments.length; i++) {
			r += arguments[i];
			if (i < (arguments.length - 1)) r += "/";
		}

		var new_url = decodeURI(location.href);
		if (new_url.indexOf("#") >= 0) {
			new_url = new_url.substring(0, new_url.indexOf("#")) + "#!/" + r;
		}
		else {
			new_url = new_url + "#!/" + r;
		}
		location.href = new_url;
	};

	window.onhashchange = self.detect_url_change;

	return self;
}();

