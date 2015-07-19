var Router = function() {
	"use strict";

	var self = {};
	var old_url;
	var tabs = {};

	BOOTSTRAP.on_init.push(function(root_template) { 
		tabs.album = true;
		tabs.artist = true;
		tabs.group = true;
		tabs.listener = true;

		root_template.list_close.addEventListener("click", function() {
			document.body.classList.remove("playlist");
			for (var i in tabs) {
				document.body.classList.remove("playlist_" + i);
			}
		});
	});

	BOOTSTRAP.on_draw.push(function(root_template) {
		AlbumList(root_template.album_list);
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
			var new_route = self.get_current_url();
			if (!new_route) return false;
			if (typeof(ga) == "object") ga("send", "pageview", "/" + new_route);
			new_route = new_route.split("/");
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
		for (var i in tabs) {
			document.body.classList.remove("playlist_" + i);
		}
		document.body.classList.add("playlist");

		document.body.classList.add("playlist_" + typ);
		if (id && !isNaN(id)) {
			// open thingit
		}
	};

	self.change = function() {
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
			location.replace(new_url);
		}
		self.detect_url_change();
	};

	window.onhashchange = self.detect_url_change;
	return self;
}();
