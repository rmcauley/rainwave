var Requests = function() {
	"use strict";
	var self = {};

	var container;
	var el;
	var scroller;
	var link;
	var link_text;
	var header;
	var indicator;
	var indicator2;
	var padder;
	var helpmsg;

	var songs = [];

	BOOTSTRAP.on_draw.push(function(root_template) {
		scroller = Scrollbar.create(el, false, true);
		scroller.scrollblock.classList.add("request_scrollblock");
		Sizing.requests_area = scroller.scrollblock;
	});

	BOOTSTRAP.on_init.push(function(root_template) {
		el = root_template.requests;
		header = root_template.request_header;
		link = root_template.request_link;
		link_text = root_template.request_link_text;
		indicator = root_template.request_indicator;
		container = root_template.requests_container;
		if (root_template.request_indicator2) {
			indicator2 = root_template.request_indicator2;
		}

		helpmsg = document.createElement("div");
		helpmsg.className = "blank_request_message";
		helpmsg.textContent = $l("make_a_request");

		API.add_callback("requests", self.update);
		API.add_callback("user", self.show_queue_paused);

		root_template.requests_container.addEventListener("click", function(e) {
			e.stopPropagation();
		});

		root_template.request_close.addEventListener("click", function() {
			Router.change();
		});

		root_template.requests_pause.addEventListener("click", self.pause_queue);
		root_template.requests_play.addEventListener("click", self.pause_queue);
		root_template.requests_clear.addEventListener("click", self.clear_requests);
		root_template.requests_unrated.addEventListener("click", self.fill_with_unrated);
		root_template.requests_favfill.addEventListener("click", self.fill_with_faves);

		padder = root_template.last_request_padder;

		link.addEventListener("click", function() {
			if (!document.body.classList.contains("requests")) {
				Router.change("requests");
			}
			else {
				Router.change();
			}
		});
	});

	self.show_queue_paused = function() {
		if (User.requests_paused) {
			container.classList.add("paused");
			link.classList.add("paused");
		}
		else {
			container.classList.remove("paused");
			link.classList.remove("paused");
		}
		self.update_header();
	};

	self.update_header = function() {
		var good_requests = 0;
		var all_bad = songs.length > 0;
		for (var i = 0; i < songs.length; i++) {
			if (songs[i].good) {
				all_bad = false;
				good_requests++;
			}
		}

		el.classList.remove("warning");
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
					el.classList.add("warning");
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
		var found_song;
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
		API.async_get("delete_request", { "song_id": song_id },
			null,
			function() {
				found_song._deleted = false;
				found_song.el.classList.remove("deleted");
			}
		);
	};

	self.remove_event = function(e) {
		if (!this._song_id) return;
		self.remove(this._song_id);
	};

	self.make_clickable = function(el, song_id) {
		el._request_song_id = song_id;
		el.addEventListener("click", clicked);
	};

	var clicked = function(e) {
		if (!this._request_song_id) return;
		self.add(this._request_song_id);
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
		var previous_length = songs.length;

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
		self.show_queue_paused();
		self.update_header();

		if ((songs.length === 0) && Sizing.simple) {
			el.appendChild(helpmsg);
		}
		else if (helpmsg.parentNode) {
			el.removeChild(helpmsg);
		}

		requestNextAnimationFrame(self.reflow);
		if (!document.body.classList.contains("loading") && (previous_length != songs.length)) {
			self.indicate(songs.length - previous_length, previous_length);
		}
	};

	var indicator_timeout;
	var indicator_start_count;

	self.indicate = function(new_count, previous_length) {
		if (indicator_timeout) {
			clearTimeout(indicator_timeout);
		}
		if (!indicator_start_count) {
			indicator_start_count = previous_length;
		}
		else {
			new_count = songs.length - indicator_start_count;
		}

		if (new_count > 0) {
			indicator.textContent = "+" + new_count;
			if (indicator2) {
				indicator2.textContent = "+" + new_count;
			}
		}
		else if (new_count < 0) {
			indicator.textContent = "-" + new_count;
			if (indicator2) {
				indicator2.textContent = "-" + new_count;
			}
		}
		else {
			indicator.textContent = "=";
			if (indicator2) {
				indicator2.textContent = "=";
			}
		}
		indicator.classList.add("show");
		if (indicator2) {
			indicator2.classList.add("show");
		}
		indicator_timeout = setTimeout(unindicate, 2000);
	};

	var unindicate = function() {
		indicator.classList.remove("show");
		if (indicator2) {
			indicator2.classList.remove("show");
		}
		indicator_timeout = setTimeout(blank_indicator, 300);
		indicator_start_count = false;
	};

	var blank_indicator = function() {
		indicator_timeout = null;
		indicator.textContent = "";
		if (indicator2) {
			indicator2.textContent = "";
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

	// DRAG AND DROP *********************************************************

	var dragging_song;
	var dragging_index;
	var order_changed = false;
	var original_mouse_y;
	var original_request_y;
	var last_mouse_event;
	var current_dragging_y;
	var direction_tripped = false;
	var upper_fold;
	var lower_fold;

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
			scroller.scrollblock.classList.add("dragging");
			dragging_song.el.classList.add("dragging");
			document.body.classList.add("unselectable");
			window.addEventListener("mousemove", capture_mouse_move);
			window.addEventListener("mouseup", stop_drag);

			upper_fold = (Sizing.detail_header_size * 3) + Sizing.menu_height + Math.ceil(Math.max(Sizing.song_size, Math.min(Sizing.height / 5, 200)));
			lower_fold = Math.ceil(Math.max(Sizing.song_size, Math.min(Sizing.height / 5, 200)));

			if ((original_mouse_y > upper_fold) && (original_mouse_y < lower_fold)) {
				direction_tripped = true;
			}
			else {
				direction_tripped = false;
			}

			requestAnimationFrame(continue_drag);
			e.preventDefault();
			e.stopPropagation();
			return false;
		}
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
			if (!direction_tripped) {
				if (original_mouse_y - last_mouse_event.clientY >= 15) {
					direction_tripped = true;
				}
			}
			if (direction_tripped) {
				scroller.scroll_to(scroller.scroll_top - (25 - (Math.floor(last_mouse_event.clientY / upper_fold * 25))));
			}
		}
		else if ((last_mouse_event.clientY > (Sizing.height - lower_fold)) && (scroller.scroll_top < scroller.scroll_top_max)) {
			if (!direction_tripped) {
				if (last_mouse_event.clientY - original_mouse_y >= 15) {
					direction_tripped = true;
				}
			}
			scroller.scroll_to(scroller.scroll_top + Math.floor((lower_fold - (Sizing.height - last_mouse_event.clientY)) / lower_fold * 20));
		}
		else {
			direction_tripped = true;
		}
		requestAnimationFrame(continue_drag);
	};

	var stop_drag = function(e) {
		scroller.scrollblock.classList.remove("dragging");
		dragging_song.el.classList.remove("dragging");
		document.body.classList.remove("unselectable");
		window.removeEventListener("mousemove", continue_drag);
		window.removeEventListener("mouseup", stop_drag);
		dragging_song = null;
		self.reflow();

		if (order_changed) {
			var song_order = "";
			for (var i = 0; i < songs.length; i++) {
				if (i !== 0) song_order += ",";
				song_order += songs[i].id;
			}
			API.async_get("order_requests", { "order": song_order });
		}
		order_changed = false;
	};

	return self;
}();
