var Requests = function() {
	"use strict";
	var self = {};
	var el;
	var container;
	var scroller;
	var height;
	var fake_hover_timeout;
	var songs = [];

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
		el = $id("requests_list");
		container = $id("requests");
		if (!Prefs.get("requests_sticky")) {
			container.className = "nonsticky";
		}
		else {
			container.className = "sticky";
		}
		container.addEventListener("mouseover", mouse_over);
		scroller = Scrollbar.new(el);
		scroller.use_fixed = true;
		$id("requests_header").textContent = $l("Requests");
		self.on_resize();
		API.add_callback(self.update, "requests");
	};

	self.on_resize = function(new_height) {
		if (new_height) height = new_height
		if (el && $has_class(container, "nonsticky")) el.style.height = height + "px";
		else if (el) el.style.height = "auto";
	};

	self.add = function(song_id) {
		API.async_get("request", { "song_id": song_id });
	};

	self.make_clickable = function(el, song_id) {
		el.addEventListener("click", function() { self.add(song_id); } );
	};

	self.update = function(json) {
		var i, j, found;
		if (json.length != songs.length) {
			fake_hover();
		}

		var new_songs = [];
		for (i = 0; i < json.length; i++) {
			found = false;
			for (j = 0; j < songs.length; j++) {
				if (json[i].id == songs[j].data.id) {
					songs[j].update(json[i]);
					new_songs.push(songs[j]);
					found = true;
				}
			}
			if (!found) {
				new_songs.push(TimelineSong(json[i]));
				new_songs.push(TimelineSong(json[i]));
			}
		}

		for (i = 0; i < new_songs.length; i++) {
			el.appendChild(new_songs[i].el);
		}
		songs = new_songs;
		scroller.update_scroll_height();
	};

	return self;
}();