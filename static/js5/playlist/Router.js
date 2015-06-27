var Router = function() {
	"use strict";

	var self = {};
	var old_url;
	var tabs = {};

	BOOTSTRAP.on_init.push(function(root_template){ 
		tabs.album = true;
		tabs.artist = true;
		tabs.group = true;
		tabs.listener = true;
	});

	self.get_current_url = function() {
		var deeplinkurl = decodeURI(location.href);
		if (deeplinkurl.indexOf("#!/") >= 0) {
			return deeplinkurl.substring(deeplinkurl.indexOf("#!/") + 3);
		}
		return null;
	};

	self.detect_url_change = function() {
		if (old_url != location.href) {
			old_url = location.href;
			var new_route = self.get_current_url().split("/");
			if (tabs[new_route[0]]) {
				self.open_route(new_route[0], new_route[1]);
			}
			else {
				// TODO: show error
			}
		}
		return false;
	};

	self.open_route = function(typ, id) {
		console.log(typ + " - " + id);
		for (var i in tabs) {
			document.body.classList.remove("playlist_" + i);
		}
		document.body.classList.add("playlist");

		if (id && !isNaN(id)) {
			document.body.classList.add("playlist_" + typ);
			// open thingit
		}
	};

	window.onhashchange = self.detect_url_change;
	return self;
}();
