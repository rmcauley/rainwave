var History = function() {
	"use strict";
	var self = {};
	var el;
	var scrollblock;
	var scroller;
	var songs = [];
	var css_left = 0;
	var scroll_update_timeout;
	var updated = false;
	var shown = false;

	var mouse_over = function(e) {
		$remove_class(container, "fake_hover");
		if (fake_hover_timeout) {
			clearTimeout(fake_hover_timeout);
			fake_hover_timeout = null;
		}
	};

	var fake_hover = function() {
		fake_hover_timeout = setTimeout(function() { $remove_class(container, "fake_hover"); fake_hover_timeout = null; }, 3000);
		$add_class(container, "fake_hover");
	};

	self.initialize = function() {
		scrollblock = $id("history");
		el = $id("history_list");
		API.add_callback(self.update, "sched_history");
		$id("history_link_container").addEventListener("mouseover", self.show);
	};

	self.scroll_init = function() {
		scroller = Scrollbar.new(el, $id("history_scrollbar"));
		scroller.unrelated_positioning = true;
	};

	self.draw = function() {
		el.style.width = 380 + Scrollbar.get_scrollbar_width() + "px";
	};

	self.show = function() {
		if (!updated && shown) return;
		if (!css_left) {
			css_left = 380 - $id("history_link_container").offsetWidth + 10;
			scrollblock.style[Fx.transform_string] = "translateX(-" + css_left + "px)";
		}
		for (var i = songs.length - 1; i >= 0; i--) {
			el.insertBefore(songs[i].el, el.firstChild);
			el.insertBefore(songs[i].header, el.firstChild);
		}
		// has to be *4 because of the header also being a child of el
		while (el.children.length > (songs.length * 4)) {
			el.removeChild(el.lastChild);	// header!
			el.removeChild(el.lastChild);
		}
		for (i = 0; i < e.children.length; i++) {
			if (el.children[i]._start_actual) {
				el.children[i].textContent = $l("played_ago", { "time": Formatting.cooldown_glance(Clock.now - (json[i].start_actual + Clock.get_time_diff())) });
			}
		}
		scroller.recalculate(null, 650);
		scroller.refresh();
	};

	self.update = function(json) {
		updated = true;
		shown = false;
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
	};

	self.on_resize = function() {};

	return self;
}();