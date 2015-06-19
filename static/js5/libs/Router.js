var Router = function() {
	"use strict";

	var self = {};
	self.current_route = null;
	var routes = {};
	var old_url;

	self.register_route = function(route, callback) {
		routes[route] = callback;
	};

	self.delete_route = function(route) {
		if (route in routes) {
			if (route.ondestroy) {
				route.ondestroy();
			}
			delete(routes[route]);
		}
	};

	self.has_deep_link = function() {
		var deeplinkurl = decodeURI(location.href);
		return (deeplinkurl.indexOf("#!/") >= 0);
	};

	self.get_current_url = function() {
		var deeplinkurl = self.has_deep_link();
		if (deeplinkurl) {
			return deeplinkurl.substring(deeplinkurl.indexOf("#!/") + 3);
		}
		return null;
	};

	var open_route = function(new_route) {
		var pass_in = new_route.split("/");
		var route;
		while (pass_in.length > 0) {
			route = pass_in.join("/");
			if (route in routes) {
				routes[route].apply(this, new_route.split("/"));
				return true;
			}
			pass_in.pop();
		}
		// TODO: error handling, maybe show a 404 permanent error they can dismiss?
		return false;
	};

	self.detect_url_change = function() {
		var changed = false;
		self.current_route = self.get_current_url();
		if (old_url != location.href) {
			if (self.current_route) {
				open_route(self.current_route);
				changed = true;
			}
			old_url = location.href;
		}
		return changed;
	};

	self.change = function() {
		// each argument passed in to this function is changed into a URL
		// this function deals with where to place things after the #!

		// do not use Array.prototype.join.call here - breaks V8 optimization
		var r = "";
		for (var i = 0; i < arguments.length; i++) {
			if (r) r += "/";
			r += arguments[i];
		}
		var new_url = decodeURI(location.href);
		if (new_url.indexOf("#") >= 0) {
			new_url = new_url.substring(0, new_url.indexOf("#")) + "#!/" + r;
		}
		else {
			new_url = new_url + "#!/" + r;
		}
		if (old_url == new_url) {
			old_url = null;
		}
		else {
			location.href = new_url;
		}
		self.detect_url_change();
	};

	window.onhashchange = self.detect_url_change;
	return self;
}();
