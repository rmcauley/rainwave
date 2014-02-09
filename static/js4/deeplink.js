var DeepLinker = function() {
	"use strict";

	var self = {};
	var old_url;
	var routes = {};

	self.register_route = function(route, callback) {
		routes[route] = callback;
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
			routes[route].apply(this, args);
		}
	};

	self.change_url = function(route, args) {
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

