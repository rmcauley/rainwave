var History = function() {
	"use strict";
	var self = {};
	var el;
	var container;
	var scroller;
	var height;
	var fake_hover_timeout;
	var songs = [];
	var dragging_song;
	var dragging_index;
	var order_changed = false;
	var original_mouse_y;

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
		Prefs.define("history_sticky");
		el = $id("history_list");
		container = $id("history");
		if (!Prefs.get("history_sticky")) {
			container.className = "nonsticky";
		}
		else {
			container.className = "sticky";
		}
		container.addEventListener("mouseover", mouse_over);
		scroller = Scrollbar.new(container, 22);
		$id("history_pin").addEventListener("click", self.swap_sticky);
		$id("history_header").appendChild($el("span", { "textContent": $l("Previously Played") }));
		self.on_resize();

		API.add_callback(self.update, "sched_history");
	};

	self.swap_sticky = function() {
		if ($has_class(container, "nonsticky")) {
			$add_class(container, "sticky");
			$remove_class(container, "nonsticky");
			Prefs.change("history_sticky", true);
		}
		else {
			// this little flip prevents the transition on non-sticky behaviour from screwing with the visuals here
			// CAREFUL ORDERING OF THE CSS VALUES is required in requests.css to make sure this is pulled off
			$add_class(container, "nonsticky");
			$add_class(container, "fake_hover");
			container.style.transition = "none";
			$remove_class(container, "sticky");
			Fx.delay_css_setting(container, "transition", null);
			Prefs.change("history_sticky", false);
			setTimeout(function() { $remove_class(container, "fake_hover"); }, 100);
		}
	};

	self.update = function(json) {
		var found;
		for (var i = 0; i < json.length; i++) {
			
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
				n.elements.request_drag.addEventListener("mousedown", start_drag);
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
		if (container) container.style.height = height + "px";
	};

	self.reflow = function() {
		var running_height = 5;
		for (var i = 0; i < songs.length; i++) {
			if (dragging_song != songs[i]) {
				songs[i]._request_y = running_height;
				Fx.delay_css_setting(songs[i].el, "transform", "translateY(" + running_height + "px)");
			}
			running_height += TimelineSong.height;
		}
		if (scroller) scroller.update_scroll_height(running_height);
	};

	return self;
}();