var Requests = function() {
	"use strict";
	var self = {};
	
	var el;
	var scroller;
	var link;
	var header;
	
	var songs = [];

	var dragging_song;
	var dragging_index;
	var order_changed = false;
	var original_mouse_y;

	BOOTSTRAP.on_draw.push(function(root_template) {
		scroller = Scrollbar.create(el);
	});

	BOOTSTRAP.on_init.push(function(root_template) {
		el = root_template.requests;
		header = root_template.header;
		link = root_template.request_link;

		API.add_callback(self.update, "requests");
		API.add_callback(self.show_queue_paused, "user");

		root_template.requests_pause.addEventListener("click", self.pause_queue);
		root_template.requests_clear.addEventListener("click", self.clear_requests);
		root_template.requests_unrated.addEventListener("click", self.fill_with_unrated);
		root_template.requests_favfill.addEventListener("click", self.fill_with_faves);
	});

	self.show_queue_paused = function() {
		if (User.requests_paused) {
			el.classList.add("paused");
		}
		else {
			el.classList.remove("paused");
		}
		self.update_header();
	};

	self.update_header = function() {
		var good_requests = 0;
		var all_bad = false;
		for (var i = 0; i < songs.length; i++) {
			if (songs[i].good) {
				all_bad = false;
				good_requests++;
			}
		}

		el.classList.remove("warning");
		
		if (User.tuned_in) {
			if (!User.requests.paused) {
				if (good_requests) {
					link.textContent = $l("Requests") + " (" + good_requests + ")";
				}
				else {
					link.textContent = $l("Requests");
				}

				if (all_bad) {
					header.textContent = $l("requests_all_on_cooldown");
					el.classList.add("warning");
				}
				else if (User.request_position) {
					header.textContent = $l("request_you_are_x_in_line", { "position": User.request_position });
				}
				else {
					header.textContent = $l("Requests");
				}
			}
			else {
				header.textContent = $l("request_grab_tag__paused");
				link.textContent = $l("Requests") + " ⏸";
			}
		}
		else {
			header.textContent = $l("Requests");
			link.textContent = $l("Requests");
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
		API.async_get("delete_request", { "song_id": song_id });
	};

	self.make_clickable = function(el, song_id) {
		el.addEventListener("click", function() { self.add(song_id); } );
	};

	self.update = function(json) {
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
				n.el.style[Fx.transform_string] = "translateY(" + Sizing.height + "px)";
				new_songs.unshift(n);
				el.appendChild(n.el);
			}
		}
		for (i = songs.length - 1; i >= 0; i--) {
			Fx.remove_element(songs[i].el);
		}
		songs = new_songs;
		self.show_queue_paused();
		self.update_header();
		self.reflow();
	};

	self.reflow = function() {
		var running_height = 25;
		for (var i = 0; i < songs.length; i++) {
			songs[i]._request_y = running_height;
			songs[i].el.style.transform = "translateY(" + (running_height + (Sizing.height * (i + 1))) + "px)";
			running_height += Sizing.song_size;
		}
		scroller.delay_force_height = running_height;
		el.style.height = running_height + "px";
		self.reflow = self.real_reflow;
		requestAnimationFrame(self.real_reflow);
	};

	self.real_reflow = function() {
		var running_height = 25;
		for (var i = 0; i < songs.length; i++) {
			if (dragging_song != songs[i]) {
				songs[i]._request_y = running_height;
				Fx.delay_css_setting(songs[i].el, "transform", "translateY(" + running_height + "px)");
			}
			running_height += Sizing.song_size;
		}
		scroller.set_height(running_height);
	};

	// DRAG AND DROP *********************************************************

	var start_drag = function(e) {
		var song_id = e.target._song_id || e.target.parentNode._song_id;
		if (song_id) {
			for (var i = 0; i < songs.length; i++) {
				if (song_id == songs[i].data.id) {
					dragging_song = songs[i];
					dragging_index = i;
					break;
				}
			}
			original_mouse_y = Mouse.get_y(e);
			dragging_song.$t.root.classList.add("dragging");
			document.body.classList.add("unselectable");
			window.addEventListener("mousemove", continue_drag);
			window.addEventListener("mouseup", stop_drag);
			e.preventDefault();
			e.stopPropagation();
			return false;
		}
	};

	var continue_drag = function(e) {
		var new_y = dragging_song._request_y - (Mouse.y - Mouse.get_y(e));
		var new_index = Math.floor((new_y + (Sizing.song_size * 0.3)) / Sizing.song_size);
		if (new_index >= songs.length) new_index = songs.length - 1;
		if (new_index < 0) new_index = 0;
		if (new_index != dragging_index) {
			songs.splice(dragging_index, 1);
			songs.splice(new_index, 0, dragging_song);
			self.reflow();
			dragging_index = new_index;
			order_changed = true;
		}
		dragging_song.el.style[Fx.transform_string] = "translateY(" + new_y + "px)";
	};

	var stop_drag = function(e) {
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