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
	var ready_to_render = true;
	var rendered_type;
	var rendered_id;
	var last_open;
	var detail_header;

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
		detail_header = root_template.detail_header;

		root_template.lists.addEventListener("click", function(e) {
			if (Sizing.simple && document.body.classList.contains("detail") && !document.body.classList.contains("desktop")) {
				self.change(current_type);
			}
			e.stopPropagation();
		});

		root_template.detail_container.addEventListener("click", function(e) {
			e.stopPropagation();
		});

		root_template.sizeable_area.addEventListener("click", function(e) {
			if (Sizing.simple && ((e.target.nodeName.toLowerCase() != "a") || !e.target.getAttribute("href"))) {
				self.change();
			}
		});

		root_template.list_close.addEventListener("click", function() {
			self.change();
		});

		root_template.detail_close.addEventListener("click", function() {
			self.change(current_type);
		});

		API.add_callback("_SYNC_COMPLETE", function() {
			reset_cache();
			if (current_type && current_id && document.body.classList.contains("detail")) {
				open_view(current_type, current_id);
			}
		});
	});

	BOOTSTRAP.on_draw.push(function(root_template) {
		lists.album = AlbumList(root_template.album_list);
		lists.artist = ArtistList(root_template.artist_list);
		lists.listener = RequestLineList(root_template.listener_list);
		lists.group = GroupList(root_template.group_list);

		scroll = Scrollbar.create(el);
		Sizing.detail_area = scroll.scrollblock;
		scroll.reposition_hook = function() {
			if (current_type && current_id) scroll_positions[current_type][current_id] = scroll.scroll_top;
		};
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
				document.body.classList.remove("requests");
				for (var i in tabs) {
					document.body.classList.remove("playlist_" + i);
				}
				self.active_list = false;
				current_type = null;
				current_id = null;
				return false;
			}
			if (typeof(ga) == "object") ga("send", "pageview", "/" + new_route);
			new_route = new_route.split("/");
			document.body.classList.remove("requests");
			if (tabs[new_route[0]]) {
				self.open_route(new_route[0], new_route[1]);
			}
			else if (new_route[0] == "requests") {
				self.open_route();
				document.body.classList.add("requests");
			}
			else {
				// TODO: show error
			}
		}
		return false;
	};

	var actually_open = function(typ, id) {
		if (!ready_to_render) {
			return;
		}

		if (!document.body.classList.contains("detail")) {
			// console.log("Sliding out.");
			document.body.classList.add("detail");
		}

		if ((rendered_type == typ) && (rendered_id == id)) return;

		rendered_type = typ;
		rendered_id = id;

		// console.log("Rendering.");

		while (el.firstChild) {
			el.removeChild(el.firstChild);
		}

		var t;
		if (cache[typ][id]._cache_el) {
			el.appendChild(cache[typ][id]._cache_el);
			detail_header.textContent = cache[typ][id]._header_text;
			detail_header.setAttribute("title", cache[typ][id]._header_text);
		}
		else {
			t = views[typ](el, cache[typ][id]);
			detail_header.textContent = t._header_text;
			detail_header.setAttribute("title", t._header_text);
			el.appendChild(t._root);
			if (t._root && t._root.tagName && (t._root.tagName.toLowerCase() == "div")) {
				cache[typ][id]._header_text = t._header_text;
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
	};

	var open_view = function(typ, id) {
		if (typ in cache) {
			current_type = typ;
			current_id = id;

			/*

			The way R5 loads things is based on what environment the user is in.
			The operations necessary are:
			- Slide out the window(s)
			- Load the list (if necessary)
			- Render the list (if necessary)
			- Load the content
			- Render the content

			If on mobile, render and load times are going to be slower, so we
			always slide a blank window out first to give immediate user feedback.
			On desktop, sliding out the window first will result in a blank window
			sliding out and then immediately rendering 99% of the time.
			This will give the *impression* that the page is slower than
			loading & rendering first THEN sliding out the complete window.
			(even if, in wall clock time, it takes fewer milliseconds to slide
			the window out blank)

			TODO: I need to re-document this because holy shitballs
			Also: try and get header names from the playlists if they're loaded

			*/

			if ((!document.body.classList.contains("playlist") && !lists[typ].loaded) || API.is_slow) {
				// console.log("Clearing detail.");
				ready_to_render = false;
				rendered_type = false;
				rendered_id = false;
				while (el.firstChild) {
					el.removeChild(el.firstChild);
				}
				if (!document.body.classList.contains("detail")) {
					setTimeout(function() {
						// console.log("Slide finished.");
						actually_open(typ, id);
						ready_to_render = true;
					}, 300);
					document.body.classList.add("detail");
				}
				else {
					ready_to_render = true;
				}
			}
			else {
				ready_to_render = true;
			}

			if (!cache[typ][id]) {
				// console.log("Loading from server.");
				cache[typ][id] = true;
				API.async_get(typ, { "id": id }, function(json) {
					cache[typ][id] = json[typ];
					if (current_type === typ && current_id === id) {
						// console.log("Loaded from server.");
						actually_open(typ, id);
						ready_to_render = true;
					}
				});
			}
			else if (cache[typ][id] !== true) {
				// console.log("Rendering from cache.");
				actually_open(typ, id);
				ready_to_render = true;
			}
		}
	};

	self.open_route = function(typ, id) {
		if ((!document.body.classList.contains("playlist") || API.is_slow) && (!cache[typ] || !cache[typ][id])) {
			ready_to_render = false;
		}

		for (var i in tabs) {
			document.body.classList.remove("playlist_" + i);
		}
		var close_detail = true;
		if (typ in lists && lists[typ]) {
			last_open = typ;
			document.body.classList.add("playlist");
			document.body.classList.add("playlist_" + typ);
			self.active_list = lists[typ];
			if ((typ != current_type) && document.body.classList.contains("normal")) {
				close_detail = false;
			}
			current_type = typ;
		}
		else {
			document.body.classList.remove("playlist");
		}

		if (id && !isNaN(id)) {
			if (!ready_to_render) {
				detail_header.textContent = lists[typ].get_title_from_id(id) || $l("Loading...");
			}
			// if (!ready_to_render) {
			// 	lists[typ].scroll_to_id(id);
			// }
			open_view(typ, id);
			lists[typ].set_new_open(id);
			// if (ready_to_render) {
				lists[typ].scroll_to_id(id);
			// }
		}
		else if (close_detail) {
			document.body.classList.remove("detail");
		}

		if (typ in lists && lists[typ]) {
			if (!self.active_list.loaded) {
				self.active_list.load();
			}
		}
		else {
			self.active_list = null;
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
			location.href = new_url;
		}
		self.detect_url_change();
	};

	self.open_last = function() {
		self.change(last_open || "album");
	};

	window.onhashchange = self.detect_url_change;
	return self;
}();
