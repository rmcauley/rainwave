var Router = function() {
	"use strict";

	var self = {};
	self.current_route = [];
	var routes = {};
	var old_url;

	self.register_route = function(route, callback) {
		routes[route] = callback;
	};

	self.has_deep_link = function() {
		var deeplinkurl = decodeURI(location.href);
		return (deeplinkurl.indexOf("#!/") >= 0);
	};

	self.get_current_url = function() {
		var deeplinkurl = decodeURI(location.href);
		if (deeplinkurl.indexOf("#!/") >= 0) {
			return deeplinkurl.substring(deeplinkurl.indexOf("#!/") + 3).split("/");
		}
		return [];
	};

	self.detect_url_change = function() {
		var changed = false;
		self.current_route = self.get_current_url();
		if (old_url != location.href) {
			var args = self.current_route;
			if (args.length) {
				self.open_route.apply(this, args);
				changed = true;
			}
			old_url = location.href;
		}
		return changed;
	};

	self.open_route = function() {
		var pass_in = Array.prototype.slice.call(arguments, 0);
		var route;
		while (pass_in.length > 0) {
			route = pass_in.join(".");
			if (route in routes) {
				routes[route].apply(this, Array.prototype.slice.call(arguments, 0));
				return;
			}
			pass_in.pop();
		}
		// TODO: handle errors
	};

	self.change = function() {
		// each argument passed in to this function is changed into a URL
		// this function deals with where to place things after the #!
		var r = Array.prototype.join.call(arguments, "/");
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
