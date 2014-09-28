var History = function() {
	"use strict";
	var self = {};
	var outer_container;
	var container;
	var el;
	var has_init = false;
	var songs = [];
	var is_mouseover = false;

	self.initialize = function() {
		if (MOBILE) return;

		outer_container = $id("history_outer_container");
		container = $id("history_container");
		el = $id("history_list");
		API.add_callback(self.update, "sched_history");
	};

	self.scroll_init = function() {};

	self.draw = function() {
		$id("history_header").textContent = $l("previouslyplayed");
		$id("longhist_modal_header").textContent = $l("extended_history_header");
		$id("longhist_link").textContent = $l("extended_history_link");
		$id("longhist_link").addEventListener("click", function() { API.async_get("playback_history", { "per_page": 40 }); });
		outer_container.addEventListener("mouseover", mouseover);
		outer_container.addEventListener("mouseout", mouseout);
		container.style.height = "0px";
		API.add_callback(open_long_history, "playback_history");
	};

	var mouseover = function(e) {
		if (is_mouseover) return;
		is_mouseover = true;
		el.style.top = "0px";
		container.style.height = (songs.length * TimelineSong.height) + "px";
	};

	var mouseout = function(e) {
		if (Mouse.is_mouse_leave(e, outer_container)) {
			el.style.top = -(songs.length * TimelineSong.height) + "px";
			container.style.height = "0px";
		}
	};

	self.update = function(json) {
		var found, i, j, new_song;
		var new_songs = [];
		for (i = 0; i < json.length; i++) {
			found = false;
			for (j = 0; j < songs.length; j++) {
				if (songs[j].data.id == json[i].songs[0].id) {
					new_songs.push(songs[j]);
					songs.splice(j, 1);
					found = true;
					break;
				}
			}
			if (!found) {
				new_song = TimelineSong.new(json[i].songs[0]);
				new_song.header = $el("div", { "class": "history_song_header", "textContent": $l("previouslyplayed") });
				new_song.header._start_actual = json[i].start_actual;
				new_songs.push(new_song);
			}
		}
		songs = new_songs;

		while (songs.length > 5) {
			songs.shift();
		}

		if (!has_init) {
			el.style.top = -(songs.length * TimelineSong.height) + "px";
		}

		for (i = songs.length - 1; i >= 0; i--) {
			el.appendChild(songs[i].el);
		}
	};

	self.on_resize = function() {};

	var open_long_history = function(json) {
		var w = $id("longhist_window");
		while (w.firstChild) {
			w.removeChild(w.firstChild);
		}

		var t = SongsTable(json, [ "song_played_at", "title", "album_name", "rating" ]);
		w.appendChild(t);

		Menu.show_modal($id("longhist_window_container"));
	};

	return self;
}();