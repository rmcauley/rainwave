var Router = function() {
	"use strict";

	var self = {};
	var old_url;
	var tabs = {};
	var lists = {};
	var cache = {};
	var current_type;
	var current_id;
	var el;
	var views = {};
	var scroll;
	var scroll_positions = {};
	var cache_page_stack;
	self.active_list = null;

	var reset_cache = function() {
		cache.album = {};
		cache.artist = {};
		if (!MOBILE) {
			cache.group = {};
			cache.listener = {};
			cache_page_stack = [];
		}
	};

	BOOTSTRAP.on_init.push(function(root_template) {
		tabs.album = true;
		views.album = AlbumView;
		scroll_positions.album = {};

		tabs.artist = true;
		views.artist = ArtistView;
		scroll_positions.artist = {};

		if (!MOBILE) {
			tabs.group = true;
			views.group = GroupView;
			scroll_positions.group = {};

			views.listener = ListenerView;
			tabs.listener = true;
			scroll_positions.listener = {};
		}

		reset_cache();

		el = root_template.detail;

		root_template.lists.addEventListener("click", function(e) {
			document.body.classList.remove("detail");
			e.stopPropagation();
		});

		root_template.detail.addEventListener("click", function(e) {
			e.stopPropagation();
		});

		root_template.sizeable_area.addEventListener("click", function(e) {
			if (Sizing.simple && ((e.target.nodeName.toLowerCase() != "a") || !e.target.getAttribute("href"))) {
				Router.change();
			}
		});

		root_template.list_close.addEventListener("click", function() {
			document.body.classList.remove("playlist");
			for (var i in tabs) {
				document.body.classList.remove("playlist_" + i);
			}
			self.active_list = null;
		});

		API.add_callback("_SYNC_COMPLETE", function() {
			reset_cache();
			if (current_type && current_id) {
				open_view(current_type, current_id);
			}
		});
	});

	BOOTSTRAP.on_draw.push(function(root_template) {
		lists.album = AlbumList(root_template.album_list);
		lists.artist = ArtistList(root_template.artist_list);

		scroll = Scrollbar.create(el);
		Sizing.detail_area = scroll.scrollblock;
		scroll.set_hook(function() {
			if (current_type && current_id) scroll_positions[current_type][current_id] = scroll.scroll_top;
		});
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
			if (!new_route) {
				document.body.classList.remove("playlist");
				document.body.classList.remove("requests");
				document.body.classList.remove("detail");
				self.active_list = false;
				current_type = null;
				current_id = null;
				return false;
			}
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

	var actually_open = function(typ, id) {
		var t;
		if (cache[typ][id]._cache_el) {
			el.appendChild(cache[typ][id]._cache_el);
		}
		else {
			t = views[typ](el, cache[typ][id]);
			if (t._root && t._root.tagName && (t._root.tagName.toLowerCase() == "div")) {
				cache[typ][id]._cache_el = t._root;
				cache_page_stack.push({ "typ": typ, "id": id });
				var cps;
				while (cache_page_stack.length > 5) {
					cps = cache_page_stack.shift();
					if (cache[cps.typ][cps.id]) cache[cps.typ][cps.id]._cache_el = false;
				}
			}
		}
		var scroll_to = scroll_positions[typ][id] || 0;		// do BEFORE scroll.set_height calls reposition_callback!
		scroll.set_height(false);
		scroll.scroll_to(scroll_to);
		lists[typ].scroll_to_id(id);

		if (t && t.close) {
			t.close.addEventListener("click",
				function() {
					document.body.classList.remove("detail");
					lists[typ].set_new_open();
					self.change(current_type);
				}
			);
		}
	};

	var open_view = function(typ, id) {
		if (typ in cache) {
			current_type = typ;
			current_id = id;

			while (el.firstChild) {
				el.removeChild(el.firstChild);
			}

			document.body.classList.add("detail");
			lists[typ].set_new_open(id);
			if (!cache[typ][id]) {
				cache[typ][id] = true;
				API.async_get(typ, { "id": id }, function(json) {
					cache[typ][id] = json[typ];
					if (current_type === typ && current_id === id) {
						actually_open(typ, id);
					}
				});
			}
			else if (cache[typ][id] !== true) {
				actually_open(typ, id);
			}
		}
	};

	self.open_route = function(typ, id) {
		for (var i in tabs) {
			document.body.classList.remove("playlist_" + i);
		}
		document.body.classList.add("playlist");

		if (typ in lists && lists[typ]) {
			document.body.classList.add("playlist_" + typ);
			self.active_list = lists[typ];
			if (!self.active_list.loaded) {
				self.active_list.load();
			}
		}
		else {
			self.active_list = null;
		}

		if (id && !isNaN(id)) {
			open_view(typ, id);
		}
		else {
			document.body.classList.remove("detail");
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
