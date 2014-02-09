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
		Prefs.define("requests_sticky");
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
		$id("requests_pin").addEventListener("click", self.swap_sticky);
		$id("requests_header").appendChild($el("span", { "textContent": $l("Requests") }));
		self.on_resize();
		API.add_callback(self.update, "requests");
	};

	self.add = function(song_id) {
		API.async_get("request", { "song_id": song_id });
	};

	self.delete = function(song_id) {
		API.async_get("delete_request", { "song_id": song_id });
	};

	self.swap_sticky = function() {
		if ($has_class(container, "nonsticky")) {
			$add_class(container, "sticky");
			$remove_class(container, "nonsticky");
			Prefs.change("requests_sticky", true);
		}
		else {
			// this little flip prevents the transition on non-sticky behaviour from screwing with the visuals here
			// CAREFUL ORDERING OF THE CSS VALUES is required in requests.css to make sure this is pulled off
			$add_class(container, "nonsticky");
			container.style.transition = "none";
			$remove_class(container, "sticky");
			Fx.delay_css_setting(container, "transition", null);
			Prefs.change("requests_sticky", false);
		}
	};

	self.make_clickable = function(el, song_id) {
		el.addEventListener("click", function() { self.add(song_id); } );
	};

	self.update = function(json) {
		var i, j, found, n;
		if (json.length != songs.length) {
			fake_hover();
		}

		var new_songs = [];
		for (i = json.length - 1; i >= 0; i--) {
			found = false;
			for (j = songs.length - 1; j >= 0; j--) {
				if (json[i].id == songs[j].data.id) {
					songs[j].update(json[i]);
					new_songs.unshift(songs[j]);
					songs.splice(j, 1);
					found = true;
					break;
				}
			}
			if (!found) {
				n = TimelineSong.new(json[i], true);
				n.el.style[Fx.transform_string] = "translateY(" + height + "px)";
				new_songs.unshift(n);
				el.appendChild(n.el);
			}
		}
		for (i = songs.length - 1; i >= 0; i--) {
			Fx.remove_element(songs[i].el);
		}
		songs = new_songs;
		self.reflow();
	};

	self.on_resize = function(new_height) {
		if (new_height) height = new_height
		if (el) el.style.height = height + "px";
	};

	self.reflow = function() {
		var running_height = 5;
		for (var i = 0; i < songs.length; i++) {
			Fx.delay_css_setting(songs[i].el, "transform", "translateY(" + running_height + "px)");
			running_height += TimelineSong.height;
		}
		scroller.update_scroll_height();
	};

	return self;
}();