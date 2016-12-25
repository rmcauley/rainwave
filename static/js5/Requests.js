var SongList = function() {
	"use strict";
	var self = {};

	var container;
	var el;
	var scroller;
	var padder;

	var songs = [];

	self.get_songs = function() {
		return songs;
	};

	self.get_scroller = function() {
		return scroller;
	};

	self.on_draw = function() {
		scroller = Scrollbar.create(el, false, true);
		Sizing.requests_areas.push(scroller.scrollblock);

		// delay panel slide out
		// if (Prefs.get("pwr")) {
		// 	var move_out = function() {
		// 		out_timer = false;
		// 		scroller.scrollblock.parentNode.classList.remove("panel_open");
		// 	};
		// 	var out_timer = false;
		// 	scroller.scrollblock.addEventListener("mouseenter", function() {
		// 		scroller.scrollblock.parentNode.classList.add("panel_open");
		// 		if (out_timer) {
		// 			clearTimeout(out_timer);
		// 			out_timer = false;
		// 		}
		// 	});
		// 	scroller.scrollblock.addEventListener("mouseleave", function() {
		// 		if (!out_timer) {
		// 			out_timer = setTimeout(move_out, 200);
		// 		}
		// 	});
		// }

		scroller.scrollblock.parentNode.addEventListener("click", function(e) {
			e.stopPropagation();
		});
	};

	self.on_init = function($t) {
		el = $t.song_list;
		container = $t.song_list_container;

		$t.panel_close.addEventListener("click", self.close);

		padder = $t.last_song_padder;
	};

	self.close = function() {
		Router.change();
	};

	self.remove = function(song_id) {};

	self.remove_event = function(e) {
		if (!this._song_id) return;
		self.remove(this._song_id);
	};

	self.update = function(json) {
		if (dragging_song) {
			// we don't really need to do anything here
			// order_change will cause a request to the server
			// including any changes the user may or may not have made
			// and we'll get a fresh list of requests back
			// which'll keep things all in sync
			order_changed = true;
			return;
		}
		var i, j, found, n;

		var new_songs = [];
		for (i = json.length - 1; i >= 0; i--) {
			found = false;
			for (j = songs.length - 1; j >= 0; j--) {
				if (json[i].id == songs[j].id) {
					songs[j].update(json[i]);
					new_songs.unshift(songs[j]);
					songs.splice(j, 1);
					found = true;
					break;
				}
			}
			if (!found) {
				n = Song(json[i]);
				n.$t.request_drag._song_id = n.id;
				n.$t.request_drag.addEventListener("mousedown", start_drag);
				n.$t.request_drag.addEventListener("touchstart", start_touch_drag);
				n.$t.cancel._song_id = n.id;
				n.$t.cancel.addEventListener("click", self.remove_event);
				n.el.style[Fx.transform] = "translateY(" + Sizing.height + "px)";
				new_songs.unshift(n);
				el.appendChild(n.el);
			}
		}
		for (i = songs.length - 1; i >= 0; i--) {
			Fx.remove_element(songs[i].el);
		}
		songs = new_songs;
		for (i = songs.length - 1; i >= 0; i--) {
			songs[i].update_cooldown_info();
		}

		if (self.show_queue_paused) {
			self.show_queue_paused();
		}

		if (self.update_header) {
			self.update_header();
		}

		if (self.helpmsg) {
			if ((songs.length === 0) && Sizing.simple) {
				el.appendChild(self.helpmsg);
			}
			else if (self.helpmsg.parentNode) {
				el.removeChild(self.helpmsg);
			}
		}

		requestNextAnimationFrame(self.reflow);

		if (self.indicate) {
			self.indicate(songs.length);
		}
	};

	self.reflow = function() {
		var running_height = 0;
		for (var i = 0; i < songs.length; i++) {
			songs[i]._request_y = running_height;
			songs[i].el.style[Fx.transform] = "translateY(" + (running_height + (Sizing.height * (i + 1))) + "px)";
			running_height += Sizing.request_size;
		}
		self.reflow = self.real_reflow;
		scroller.set_height(running_height);
		requestNextAnimationFrame(self.real_reflow, 20);
	};

	self.real_reflow = function() {
		var running_height = 0;
		for (var i = 0; i < songs.length; i++) {
			if (dragging_song != songs[i]) {
				songs[i]._request_y = running_height;
				songs[i].el.style[Fx.transform] = "translateY(" + running_height + "px)";
			}
			running_height += Sizing.request_size;
		}
		padder.style[Fx.transform] = "translateY(" + (running_height - Sizing.request_size) + "px)";
		scroller.set_height(running_height);
	};

	self.find_song_to_remove = function(song_id) {
		var found_song;
		var songs = self.get_songs();
		for (var i = 0; i < songs.length; i++) {
			if (song_id == songs[i].id) {
				found_song = songs[i];
				break;
			}
		}
		if (!found_song) return;
		if (found_song._deleted) {
			return;
		}
		found_song._deleted = true;
		found_song.el.classList.add("deleted");
		return found_song;
	};

	// DRAG AND DROP *********************************************************

	var dragging_song;
	var dragging_index;
	var order_changed = false;
	var original_mouse_y;
	var original_request_y;
	var last_mouse_event;
	var current_dragging_y;
	var upper_normal_fold;
	var lower_normal_fold;
	var upper_fold;
	var lower_fold;

	var start_touch_drag = function(e) {
		var fake_event = {
			"which": 1,
			"clientY": e.touches[0].pageY,
			"target": e.target
		};
		e.preventDefault();
		e.stopPropagation();
		start_drag(fake_event);
	};

	var start_drag = function(e) {
		if (!e.which || (e.which !== 1)) {
			return;
		}

		var song_id = e.target._song_id || e.target.parentNode._song_id;
		if (song_id) {
			for (var i = 0; i < songs.length; i++) {
				if (song_id == songs[i].id) {
					dragging_song = songs[i];
					dragging_index = i;
					break;
				}
			}
			if (!dragging_song) return;
			if (dragging_song._deleted) return;
			last_mouse_event = e;
			original_mouse_y = e.clientY + scroller.scroll_top;
			original_request_y = dragging_song._request_y;
			upper_normal_fold = (Sizing.detail_header_size * 3) + Sizing.menu_height + Math.ceil(Math.max(Sizing.song_size, Math.min(Sizing.height / 5, 200)));
			upper_fold = Math.min(e.clientY, upper_normal_fold);
			lower_normal_fold = Math.ceil(Math.max(Sizing.song_size, Math.min(Sizing.height / 5, 200)));
			lower_fold = Math.min(Sizing.height - e.clientY, lower_normal_fold);
			container.classList.add("dragging");
			dragging_song.el.classList.add("dragging");
			document.body.classList.add("unselectable");
			window.addEventListener("mousemove", capture_mouse_move);
			window.addEventListener("mouseup", stop_drag);
			window.addEventListener("touchmove", capture_touch_move);
			window.addEventListener("touchend", stop_drag);
			requestAnimationFrame(continue_drag);
			if (e.preventDefault) {
				e.preventDefault();
				e.stopPropagation();
			}
		}
	};

	var capture_touch_move = function(e) {
		last_mouse_event = {
			"clientY": e.touches[0].pageY,
			"target": e.target
		};
	};

	var capture_mouse_move = function(e) {
		last_mouse_event = e;
	};

	var continue_drag = function() {
		if (!dragging_song) return;
		var new_y = original_request_y - (original_mouse_y - (last_mouse_event.clientY + scroller.scroll_top));
		if (new_y != current_dragging_y) {
			current_dragging_y = new_y;
			var new_index = Math.floor((new_y + (Sizing.request_size * 0.3)) / Sizing.request_size);
			if (new_index >= songs.length) new_index = songs.length - 1;
			if (new_index < 0) new_index = 0;
			if (new_index != dragging_index) {
				songs.splice(dragging_index, 1);
				songs.splice(new_index, 0, dragging_song);
				self.reflow();
				dragging_index = new_index;
				order_changed = true;
			}
			dragging_song.el.style[Fx.transform] = "translateY(" + new_y + "px)";
		}

		if ((last_mouse_event.clientY < upper_fold) && (scroller.scroll_top > 0)) {
			scroller.scroll_to(scroller.scroll_top - (25 - (Math.floor(last_mouse_event.clientY / upper_fold * 25))));
		}
		else if ((last_mouse_event.clientY > (Sizing.height - lower_fold)) && (scroller.scroll_top < scroller.scroll_top_max)) {
			scroller.scroll_to(scroller.scroll_top + Math.floor((lower_fold - (Sizing.height - last_mouse_event.clientY)) / lower_fold * 20));
		}
		else if ((upper_fold != upper_normal_fold) && (last_mouse_event.clientY > (upper_normal_fold + 30))) {
			upper_fold = upper_normal_fold;
		}
		else if ((lower_fold != lower_normal_fold) && (last_mouse_event.clientY < (Sizing.height - lower_normal_fold - 30))) {
			lower_fold = lower_normal_fold;
		}

		requestAnimationFrame(continue_drag);
	};

	var stop_drag = function(e) {
		container.classList.remove("dragging");
		dragging_song.el.classList.remove("dragging");
		document.body.classList.remove("unselectable");
		window.removeEventListener("mousemove", continue_drag);
		window.removeEventListener("mouseup", stop_drag);
		window.removeEventListener("touchmove", capture_touch_move);
		window.removeEventListener("touchend", stop_drag);
		dragging_song = null;
		self.reflow();

		if (order_changed && self.on_order_changed) {
			self.on_order_changed();
		}
		order_changed = false;
	};

	return self;
};

var Requests = function() {
	"use strict";
	var self = SongList();

	var link;
	var link_text;
	var header;
	var indicator;
	var indicator2;
	var root_container;

	BOOTSTRAP.on_draw.push(function() {
		self.on_draw();
		self.get_scroller().scrollblock.classList.add("request_scrollblock");
	});

	BOOTSTRAP.on_init.push(function(root_template) {
		var $t = RWTemplates.requests();
		self.on_init($t, root_template);

		header = $t.request_header;
		link = root_template.request_link;
		link_text = root_template.request_link_text;
		indicator = root_template.request_indicator;
		if (Prefs.get("pwr") && $t.request_indicator2) {
			indicator2 = $t.request_indicator2;
		}
		root_container = root_template.requests_container;

		self.helpmsg = document.createElement("div");
		self.helpmsg.className = "blank_request_message";
		self.helpmsg.textContent = $l("make_a_request");

		API.add_callback("requests", self.update);
		API.add_callback("user", self.show_queue_paused);

		$t.requests_pause.addEventListener("click", self.pause_queue);
		$t.requests_play.addEventListener("click", self.pause_queue);
		$t.requests_clear.addEventListener("click", self.clear_requests);
		$t.requests_unrated.addEventListener("click", self.fill_with_unrated);
		$t.requests_favfill.addEventListener("click", self.fill_with_faves);

		link.addEventListener("click", function() {
			if (!document.body.classList.contains("requests")) {
				Router.change("requests");
			}
			else {
				Router.change();
			}
		});

		self.indicate = Indicator(indicator, 0, indicator2);

		root_container.appendChild($t._root);
	});

	self.show_queue_paused = function() {
		if (User.requests_paused) {
			root_container.classList.add("paused");
			link.classList.add("paused");
		}
		else {
			root_container.classList.remove("paused");
			link.classList.remove("paused");
		}
		self.update_header();
	};

	self.update_header = function() {
		var good_requests = 0;
		var songs = self.get_songs();
		var all_bad = songs.length > 0;
		for (var i = 0; i < songs.length; i++) {
			if (songs[i].valid) {
				all_bad = false;
				good_requests++;
			}
		}

		root_container.classList.remove("warning");
		link.classList.remove("warning");
		header.removeAttribute("href");
		header.classList.add("no_pointer");

		if (User.tuned_in) {
			if (!User.requests_paused) {
				if (link && good_requests) {
					if (!Sizing.simple) {
						link_text.textContent = $l("#_requests", { "num_requests": good_requests });
					}
					else {
						link_text.textContent = $l("#_requests", { "num_requests": songs.length });
					}
				}
				else if (link) {
					link_text.textContent = $l("Requests");
				}

				if (all_bad) {
					header.textContent = $l("requests_all_on_cooldown");
					root_container.classList.add("warning");
					link.classList.add("warning");
				}
				else if (User.request_position) {
					header.textContent = $l("request_you_are_x_in_line", { "position": User.request_position });
					header.setAttribute("href", "#!/request_line");
					header.classList.remove("no_pointer");
				}
				else {
					header.textContent = $l("Requests");
				}
			}
			else {
				header.textContent = $l("request_grab_tag__paused");
				if (link) {
					link_text.textContent = $l("request_grab_tag__paused");
				}
			}
		}
		else {
			header.textContent = $l("Requests");
			if (link) {
				link_text.textContent = $l("Requests");
			}
		}
	};

	self.pause_queue = function() {
		if (User.requests_paused) {
			API.async_get("unpause_request_queue");
		}
		else {
			API.async_get("pause_request_queue");
		}
	};

	self.clear_requests = function() {
		API.async_get("clear_requests");
	};

	self.fill_with_unrated = function() {
		API.async_get("request_unrated_songs");
	};

	self.fill_with_faves = function() {
		API.async_get("request_favorited_songs");
	};

	self.add = function(song_id) {
		API.async_get("request", { "song_id": song_id });
	};

	self.remove = function(song_id) {
		var found_song = self.find_song_to_remove(song_id);
		if (!found_song) {
			return;
		}
		API.async_get("delete_request", { "song_id": song_id },
			null,
			function() {
				found_song._deleted = false;
				found_song.el.classList.remove("deleted");
			}
		);
	};

	self.make_clickable = function(el, song_id) {
		el._request_song_id = song_id;
		el.addEventListener("click", clicked);
	};

	var clicked = function(e) {
		if (!this._request_song_id) return;
		if (User.id === 1) {
			ErrorHandler.tooltip_error(ErrorHandler.make_error("must_login_and_tune_in_to_request", 400));
		}
		self.add(this._request_song_id);
	};

	self.on_order_changed = function(e) {
		var songs = self.get_songs();
		var song_order = "";
		for (var i = 0; i < songs.length; i++) {
			if (i !== 0) song_order += ",";
			song_order += songs[i].id;
		}
		API.async_get("order_requests", { "order": song_order });
	};

	return self;
}();
