var History = function() {
	"use strict";
	var self = {};
	var outer_container;
	var container;
	var el;
	var songs = [];
	var is_mouseover = false;

	self.initialize = function() {
		if (MOBILE) return;

		Prefs.define("sticky_history", [ false, true ]);
		Prefs.define("sticky_history_size", [ 3, 1, 2, 4, 5 ]);
		Prefs.add_callback("sticky_history", sticky_change);
		Prefs.add_callback("sticky_history_size", sticky_size_change);

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
		$id("longhist_link").addEventListener("click", function(e) { e.stopPropagation(); API.async_get("playback_history", { "per_page": 40 }); });
		$id("history_pin").addEventListener("click", function(e) { e.stopPropagation(); Prefs.change("sticky_history", !Prefs.get("sticky_history")); });
		$id("history_header_container").addEventListener("click", showing_swap);
		outer_container.addEventListener("mouseout", mouseout);
		container.style.height = "0px";
		el.style.top = -(5 * TimelineSong.height) + "px";
		sticky_change(Prefs.get("sticky_history"));
		API.add_callback(open_long_history, "playback_history");
	};

	var sticky_change = function(nv) {
		if (nv) {
			$add_class(outer_container, "sticky_history");
			$remove_class(outer_container, "nonsticky_history");
			sticky_size_change(Prefs.get("sticky_history_size"), false, true);
			// this will stop the scrollbar recalculate from firing on page load
			if (songs.length > 0) {	
				sched_scrollbar_recalculate();
			}
		}
		else {
			$remove_class(outer_container, "sticky_history");
			$add_class(outer_container, "nonsticky_history");
			$add_class(outer_container, "history_not_showing");
			is_mouseover = false;
			// same deal - stop this from firing on page load
			// if (songs.length > 0) {	
			// 	mouseover();
			// }
		}
	};

	var sticky_size_change = function(nv, ov, is_actually_sticky) {
		if (!Prefs.get("sticky_history") && !is_actually_sticky) return;
		container.style.height = (nv * TimelineSong.height) + "px";
		el.style.top = -((5 - nv) * TimelineSong.height) + "px";
		sched_scrollbar_recalculate();
	};

	var sched_scrollbar_recalculate = function() {
		Fx.chain_transition(el, function(e) {
			setTimeout(function() { Schedule.scrollbar_recalculate(); }, 200);
		});
	};

	var showing_swap = function(e) {
		if (e.button !== 0) return;
		if (is_mouseover) {
			mouseout(e, true);
		}
		else {
			mouseover(e);
		}
	};

	var mouseover = function(e) {
		// if (is_mouseover) return;
		if (Prefs.get("sticky_history")) return;
		is_mouseover = true;
		$add_class(outer_container, "history_showing");
		$remove_class(outer_container, "history_not_showing");
		el.style.top = "0px";
		container.style.height = (songs.length * TimelineSong.height) + "px";
		sched_scrollbar_recalculate();
	};

	var mouseout = function(e, override) {
		if (Prefs.get("sticky_history")) return;
		if (override || Mouse.is_mouse_leave(e, outer_container)) {
			$remove_class(outer_container, "history_showing");
			$add_class(outer_container, "history_not_showing");
			el.style.top = -(songs.length * TimelineSong.height) + "px";
			container.style.height = "0px";
			is_mouseover = false;
			sched_scrollbar_recalculate();
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
				new_song.el.style.transform = "translateY(" + (json.length * TimelineSong.height) + "px)";
				new_songs.push(new_song);
			}
		}
		songs = new_songs;

		for (i = 0; i <= (el.childNodes.length - 5); i++) {
			Fx.delay_css_setting(el.childNodes[i], "transform", "translateY(-" + TimelineSong.height + "px)");
			Fx.remove_element(el.childNodes[i]);
		}

		for (i = songs.length - 1; i >= 0; i--) {
			el.appendChild(songs[i].el);
			Fx.delay_css_setting(songs[i].el, "transform", "translateY(" + ((songs.length - i - 1) * TimelineSong.height) + "px)");
		}
	};

	self.on_resize = function() {};

	var open_long_history = function(json) {
		var w = $id("longhist_window");
		while (w.firstChild) {
			w.removeChild(w.firstChild);
		}

		var t = SongsTable(json, [ "song_played_at", "title", "album_name", "artists", "rating" ]);
		w.appendChild(t);

		Menu.show_modal($id("longhist_window_container"));
	};

	return self;
}();