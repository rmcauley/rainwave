var Router = (function() {
	"use strict";

	var self = {};
	var old_url;
	var tabs = {};
	var lists = {};
	var cache = {};
	var current_type;
	var current_id;
	var current_open_type;
	var el;
	var views = {};
	var scroll;
	var scroll_positions = {};
	var cache_page_stack;
	self.active_list = null;
	self.active_detail = null;
	var ready_to_render = true;
	var rendered_type;
	var rendered_id;
	var last_open;
	var last_open_id;
	var detail_header;
	var reset_cache_on_next_request = false;
	var request_in_flight = false;
	var has_autoplayed = false;
	var taborder = ["album", "artist", "group", "request_line"];

	var reset_cache = function() {
		// console.log("Cache reset.");
		cache.album = {};
		cache.artist = {};
		cache.group = {};
		cache.request_line = {};
		cache.listener = {};
		cache_page_stack = [];

		if (el) {
			while (el.firstChild) {
				el.removeChild(el.firstChild);
			}

			rendered_type = null;
			rendered_id = null;
		}

		if (detail_header) {
			detail_header.textContent = "";
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

			views.request_line = ListenerView;
			tabs.request_line = true;
			scroll_positions.request_line = {};

			views.listener = ListenerView;
			tabs.listener = false;
			scroll_positions.listener = {};
		}

		reset_cache();
		API.add_callback("wsthrottle", reset_cache);

		el = root_template.detail;
		detail_header = root_template.detail_header;

		root_template.lists.addEventListener("click", function(e) {
			if (
				Sizing.simple &&
				document.body.classList.contains("detail") &&
				!document.body.classList.contains("desktop")
			) {
				self.change(current_type);
			}
			e.stopPropagation();
		});

		root_template.detail_container.addEventListener("click", function(e) {
			e.stopPropagation();
		});

		root_template.sizeable_area.addEventListener("click", function(e) {
			if (Sizing.simple && (e.target.nodeName.toLowerCase() != "a" || !e.target.getAttribute("href"))) {
				self.change();
			}
		});

		root_template.list_close.addEventListener("click", function() {
			// this code broke on Chrome for some reason?!
			// also not even sure if this is a desired effect
			// so, it gets removed.

			// var type_at_close = current_type;
			// if (type_at_close) {
			// 	setTimeout(function() {
			// 		if (!document.body.classList.contains("playlist_" + type_at_close)) {
			// 			lists[type_at_close].clear_search();
			// 		}
			// 	}, 400);
			// }
			if (Sizing.simple) {
				self.change();
			}
		});

		root_template.detail_close.addEventListener("click", function() {
			if (lists[current_type]) {
				self.change(current_type);
			} else {
				self.change();
			}
		});

		API.add_callback("_SYNC_SCHEDULE_COMPLETE", function() {
			if (request_in_flight) {
				reset_cache_on_next_request = true;
			} else {
				rendered_type = null;
				rendered_id = null;
				reset_cache();
				if (current_open_type && current_id && document.body.classList.contains("detail")) {
					open_view(current_open_type, current_id);
				}
			}
		});

		window.onhashchange = self.detect_url_change;
	});

	BOOTSTRAP.on_draw.push(function(root_template) {
		lists.album = AlbumList(root_template.album_list);
		lists.artist = ArtistList(root_template.artist_list);
		lists.request_line = RequestLineList(root_template.listener_list);
		lists.group = GroupList(root_template.group_list);
		lists.listener = false;

		scroll = Scrollbar.create(el, false, !Sizing.simple);
		Sizing.detail_area = scroll.scrollblock;
		scroll.reposition_hook = function() {
			if (current_type && current_id) scroll_positions[current_type][current_id] = scroll.scroll_top;
		};
	});

	self.reset_everything = function() {
		reset_cache();
		self.change();
	};

	self.recalculate_scroll = function() {
		scroll.set_height(false);
	};

	self.scroll_a_bit = function() {
		scroll.scroll_to(scroll.scroll_top + Sizing.list_item_height * 2);
	};

	self.get_current_url = function() {
		var deeplinkurl = decodeURI(location.href);
		if (deeplinkurl.indexOf("#!/") >= 0) {
			return deeplinkurl.substring(deeplinkurl.indexOf("#!/") + 3);
		}
		return null;
	};

	self.tab_forward = function() {
		var idx = taborder.indexOf(current_type);
		if (idx === -1 || idx == taborder.length - 1) {
			idx = 0;
		} else {
			idx++;
		}
		self.change(taborder[idx]);
	};

	self.tab_backwards = function() {
		var idx = taborder.indexOf(current_type);
		if (idx <= 0) {
			idx = taborder.length - 1;
		} else {
			idx--;
		}
		self.change(taborder[idx]);
	};

	self.detect_url_change = function() {
		if (old_url != location.href) {
			old_url = location.href;
			var new_route = self.get_current_url();
			if (!new_route) {
				document.body.classList.remove("search_open");
				document.body.classList.remove("dj_open");
				if (Sizing.simple) {
					document.body.classList.remove("playlist");
					document.body.classList.remove("requests");
					document.body.classList.remove("detail");
					for (var i in tabs) {
						document.body.classList.remove("playlist_" + i);
					}
				}
				if (self.active_list && self.active_list._key_handle) {
					self.active_list.key_nav_blur();
				}
				current_type = null;
				current_id = null;
				current_open_type = null;
				return false;
			}
			if (typeof ga == "object") ga("send", "pageview", "/" + new_route);
			new_route = new_route.split("/");
			document.body.classList.remove("requests");
			document.body.classList.remove("search_open");
			document.body.classList.remove("dj_open");
			if (new_route[0] == "autoplay" && !has_autoplayed) {
				RWAudio.play();
				has_autoplayed = true;
				return false;
			}
			if (tabs[new_route[0]] || views[new_route[0]]) {
				self.open_route(new_route[0], new_route[1]);
				return true;
			} else if (new_route[0] == "requests") {
				self.open_route();
				document.body.classList.add("requests");
				return true;
			} else if (new_route[0] == "search") {
				self.open_route();
				document.body.classList.add("search_open");
				setTimeout(SearchPanel.focus, 300);
				return true;
			} else if (new_route[0] == "dj") {
				self.open_route();
				document.body.classList.add("dj_open");
				return true;
			} else {
				// TODO: show error
			}
		}
		return false;
	};

	var actually_open = function(typ, id) {
		if (!ready_to_render) {
			return;
		}

		request_in_flight = false;

		if (!document.body.classList.contains("detail")) {
			// console.log("Sliding out.");
			document.body.classList.add("detail");
		}

		if (rendered_type == typ && rendered_id == id) return;

		rendered_type = typ;
		rendered_id = id;

		// console.log("Rendering.");

		for (var i = 0; i < el.childNodes.length; i++) {
			el.childNodes[i].style.display = "none";
		}
		self.active_detail = null;
		remove_excess_header_content();

		var t;
		if (!cache[typ][id]) {
			RWTemplates.oops(null, el);
		} else if (cache[typ][id]._root) {
			// console.log(typ + "/" + id + ": Appending existing cache.");
			el.appendChild(cache[typ][id]._root);
			cache[typ][id]._root.style.display = "block";
			self.active_detail = cache[typ][id];
			detail_header.textContent = cache[typ][id]._header_text;
			detail_header.setAttribute("title", cache[typ][id]._header_text);
			if (cache[typ][id]._header_formatting) {
				cache[typ][id]._header_formatting(detail_header);
			}
		} else {
			// console.log(typ + "/" + id + ": Rendering detail.");
			t = views[typ](cache[typ][id], el);
			detail_header.textContent = t._header_text;
			detail_header.setAttribute("title", t._header_text);
			if (t._header_formatting) {
				t._header_formatting(detail_header);
			}
			if (t._root.parentNode != el) {
				el.appendChild(t._root);
			}
			if (t._root && t._root.tagName && t._root.tagName.toLowerCase() == "div") {
				cache[typ][id] = t;
				cache[typ][id]._scroll = scroll;
				self.active_detail = cache[typ][id];
				cache_page_stack.push({ typ: typ, id: id });
				var cps;
				while (cache_page_stack.length > 5) {
					cps = cache_page_stack.shift();
					if (cache[cps.typ][cps.id]) {
						if (cache[cps.typ][cps.id]._root.parentNode) {
							cache[cps.typ][cps.id]._root.parentNode.removeChild(cache[cps.typ][cps.id]._root);
						}
						delete cache[cps.typ][cps.id];
					}
				}
			}
		}

		var scroll_to = scroll_positions[typ][id] || 0; // do BEFORE scroll.set_height calls reposition_callback!
		scroll.set_height(false);
		scroll.scroll_to(scroll_to);
	};

	var open_view = function(typ, id) {
		if (typ in cache) {
			current_type = typ;
			current_id = id;
			current_open_type = typ;

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

			*/

			if (!tabs[typ] || (!document.body.classList.contains("playlist") && !lists[typ].loaded) || API.isSlow) {
				// console.log("Clearing detail.");
				ready_to_render = false;
				rendered_type = false;
				rendered_id = false;
				request_in_flight = true;
				for (var i = 0; i < el.childNodes.length; i++) {
					el.childNodes[i].style.display = "none";
				}
				self.active_detail = null;
				if (!document.body.classList.contains("detail")) {
					setTimeout(function() {
						// console.log("Slide finished.");
						if (current_open_type === typ && current_id === id) {
							actually_open(typ, id);
							ready_to_render = true;
						}
					}, 300);
					document.body.classList.add("detail");
				} else {
					ready_to_render = true;
				}
			} else {
				document.body.classList.add("detail");
				ready_to_render = true;
			}

			if (reset_cache_on_next_request) {
				reset_cache_on_next_request = false;
				reset_cache();
			}

			if (!cache[typ][id]) {
				// console.log(typ + "/" + id + ": Loading from server.");
				cache[typ][id] = true;
				var params = { id: id };
				var req = typ;
				if (req == "request_line") {
					req = "listener";
				} else if (req == "album" && Prefs.get("p_allcats")) {
					params.all_categories = true;
				}
				API.async_get(req, params, function(json) {
					cache[typ][id] = json[req];
					if (current_open_type === typ && current_id === id) {
						// console.log(typ + "/" + id + ": Loaded from server.");
						actually_open(typ, id);
						ready_to_render = true;
					}
				});
			} else if (cache[typ][id] !== true) {
				// console.log(typ + "/" + id + ": Rendering from cache.");
				actually_open(typ, id);
				ready_to_render = true;
			}
		}
	};

	var remove_excess_header_content = function() {
		detail_header.parentNode.className = "open";
		var cs = detail_header.parentNode.childNodes;
		for (var i = cs.length - 1; i >= 0; i--) {
			if (cs[i] != detail_header) {
				cs[i].parentNode.removeChild(cs[i]);
			}
		}
	};

	var force_close_detail = false;
	self.open_route = function(typ, id) {
		if (lists[typ] && ((!document.body.classList.contains("playlist") && !lists[typ].loaded) || API.isSlow)) {
			ready_to_render = false;
		}

		if (Sizing.simple || lists[typ]) {
			for (var i in tabs) {
				document.body.classList.remove("playlist_" + i);
			}
		}
		var close_detail = true;
		if (typ in lists && lists[typ]) {
			Prefs.set_new_list(typ);
			last_open = typ;
			last_open_id = id;
			document.body.classList.add("playlist");
			document.body.classList.add("playlist_" + typ);
			if (self.active_list && self.active_list._key_handle) {
				self.active_list.key_nav_blur();
			}
			self.active_list = lists[typ];
			if (typ != current_type && document.body.classList.contains("normal")) {
				close_detail = false;
			}
			current_type = typ;
			KeyHandler.route_to_lists();
		} else if (Sizing.simple) {
			document.body.classList.remove("playlist");
		}

		if (typ in lists && id && !isNaN(id)) {
			id = parseInt(id);
			if (cache[typ][id] && cache[typ][id]._root) {
				// the page is already loaded from cache and ready to go
				ready_to_render = true;
			}
			if (!ready_to_render) {
				remove_excess_header_content();
				detail_header.textContent =
					(lists[typ] && lists[typ].get_title_from_id ? lists[typ].get_title_from_id(id) : false) ||
					$l("Loading...");
			}
			var scrolled = false;
			if (!ready_to_render && lists[typ] && lists[typ].loaded) {
				lists[typ].scroll_to_id(id);
				scrolled = true;
			}
			open_view(typ, id);
			if (lists[typ]) {
				if (lists[typ].set_new_open(id) && !scrolled) {
					lists[typ].scroll_to_id(id);
				}
			}
		} else if (Sizing.simple && (close_detail || force_close_detail)) {
			document.body.classList.remove("detail");
			force_close_detail = false;
		}

		if (typ in lists && lists[typ]) {
			if (!self.active_list.loaded) {
				self.active_list.load();
			}
		} else {
			if (self.active_list && self.active_list._key_handle) {
				self.active_list.key_nav_blur();
			}
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
		} else {
			new_url = new_url + "#!/" + r;
		}
		if (old_url == new_url) {
			old_url = null;
		} else {
			location.href = new_url;
		}
		// self.detect_url_change();
	};

	self.open_last = function() {
		force_close_detail = true;
		self.change(last_open || "album");
	};

	self.open_last_id = function() {
		if (!last_open_id) {
			return self.open_last();
		} else {
			self.change(last_open, last_open_id);
		}
	};

	return self;
})();
