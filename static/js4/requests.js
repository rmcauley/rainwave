var Requests = function() {
	"use strict";
	var self = {};
	var el;
	var scroll_container;
	var container;
	var scroller;
	var header;
	var grab_tag;
	var fake_hover_timeout;
	var songs = [];
	var dragging_song;
	var dragging_index;
	var order_changed = false;
	var original_mouse_y;

	self.scroll_init = function() {
		scroll_container = $id("requests");
		scroller = Scrollbar.new(scroll_container, $id("requests_scrollbar"), 35);
		scroller.set_handle_margin_bottom(30);
	};

	self.initialize = function() {
		Prefs.define("requests_sticky");
		el = $id("requests_list");
		container = $id("requests_positioner");
		container.addEventListener("mouseover", mouse_over);
		grab_tag = $id("requests_grab_tag");

		if (!MOBILE) {
			API.add_callback(self.update, "requests");
			API.add_callback(self.show_queue_paused, "user");
		}
	};

	self.draw = function() {
		if (Prefs.get("requests_sticky")) {
			$add_class(document.body, "requests_sticky");
		}
		$id("requests_pin").addEventListener("click", self.swap_sticky);
		header = $id("requests_header").appendChild($el("span"));
		$id("requests_pause").setAttribute("title", $l("pause_request_queue"));
		$id("requests_pause").setAttribute("alt", $l("pause_request_queue"));
		$id("requests_pause").addEventListener("click", self.pause_queue);
		$id("requests_clear").setAttribute("title", $l("clear_request_queue"));
		$id("requests_clear").setAttribute("alt", $l("clear_request_queue"));
		$id("requests_clear").addEventListener("click", self.clear_requests);
		$id("requests_unrated").setAttribute("title", $l("request_fill_with_unrated"));
		$id("requests_unrated").setAttribute("alt", $l("request_fill_with_unrated"));
		$id("requests_unrated").addEventListener("click", self.fill_with_unrated);
		self.on_resize();
	};

	var mouse_over = function(e) {
		$remove_class(container, "fake_hover");
		if (fake_hover_timeout) {
			if (fake_hover_timeout !== true) clearTimeout(fake_hover_timeout);
			fake_hover_timeout = null;
		}
	};

	var fake_hover = function() {
		if (!fake_hover_timeout && !Prefs.get("requests_sticky")) {
			fake_hover_timeout = setTimeout(function() { $remove_class(container, "fake_hover"); fake_hover_timeout = null; }, 3000);
			$add_class(container, "fake_hover");
		}
	};

	var once_mouse_out = function() {
		fake_hover_timeout = null;
		container.style.transition = null;
		container.removeEventListener("mouseout", once_mouse_out);
		$remove_class(container, "fake_hover");
	};

	self.show_queue_paused = function() {
		if (User.requests_paused) {
			$add_class(container, "request_queue_paused");
		}
		else {
			$remove_class(container, "request_queue_paused");
		}

		var good_requests = 0;
		var all_cooldown = songs.length > 0 ? true : false;
		for (var i = 0; i < songs.length; i++) {
			if (!$has_class(songs[i].el, "timeline_song_is_cool")) {
				all_cooldown = false;
				good_requests++;
				break;
			}
		}

		if (!User.requests_paused && User.tuned_in && User.request_position && User.request_expires_at && (User.request_expires_at <= (Clock.now + 600)) && (User.request_expires_at > Clock.now)) {
			header.textContent = $l("requests_expiring");
			$add_class(container, "request_warning");
			grab_tag.textContent = $l("request_grab_tag__warning");
		}
		else if (!User.requests_paused && User.tuned_in && all_cooldown) {
			header.textContent = $l("requests_all_on_cooldown");
			$add_class(container, "request_warning");
			grab_tag.textContent = $l("request_grab_tag__warning");
		}
		else if (!User.requests_paused && User.request_position && (User.request_position > 0)) {
			$remove_class(container, "request_warning");
			header.textContent = $l("request_you_are_x_in_line", { "position": User.request_position });
			if (good_requests > 0) {
				grab_tag.textContent = $l("requests_grab_tab__num_requests", { "num_requests": good_requests });
			}
			else {
				grab_tag.textContent = $l("Requests");
			}
		}
		else if (!User.requests_paused) {
			$remove_class(container, "request_warning");
			if (good_requests > 0) {
				grab_tag.textContent = $l("requests_grab_tab__num_requests", { "num_requests": good_requests });
			}
			else {
				grab_tag.textContent = $l("Requests");
			}
			header.innerHTML = "&nbsp;";
		}
		else {
			$remove_class(container, "request_warning");
			grab_tag.textContent = $l("request_grab_tag__paused")
			header.innerHTML = "&nbsp;";
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

	self.add = function(song_id) {
		API.async_get("request", { "song_id": song_id });
	};

	self.delete = function(song_id) {
		API.async_get("delete_request", { "song_id": song_id });
	};

	self.swap_sticky = function() {
		if (!Prefs.get("requests_sticky")) {
			$add_class(document.body, "requests_sticky");
			Prefs.change("requests_sticky", true);
		}
		else {
			container.style.transition = "none";
			container.className = "fake_hover";
			$remove_class(document.body, "requests_sticky");
			container.addEventListener("mouseout", once_mouse_out);
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
				n.elements.request_drag.addEventListener("mousedown", start_drag);
				n.el.style[Fx.transform_string] = "translateY(" + SCREEN_HEIGHT + "px)";
				new_songs.unshift(n);
				el.appendChild(n.el);
			}
		}
		for (i = songs.length - 1; i >= 0; i--) {
			Fx.remove_element(songs[i].el);
		}
		songs = new_songs;
		self.show_queue_paused();
		self.reflow();
	};

	self.on_resize = function() {
		if (container) {
			container.style.height = MAIN_HEIGHT + "px";
			$id("requests_scrollblock").style.height = MAIN_HEIGHT + "px";
		}
		if (scroll_container) {
			scroll_container.style.width = Scrollbar.get_scrollbar_width() + 355 + "px";
		}
	};

	self.reflow = function() {
		var running_height = 5;
		for (var i = 0; i < songs.length; i++) {
			songs[i]._request_y = running_height;
			songs[i].el.style.transform = "translateY(" + (running_height + (SCREEN_HEIGHT * i)) + "px)";
			Fx.delay_css_setting(songs[i].el, "transform", "translateY(" + running_height + "px)");
			running_height += TimelineSong.height;
		}
		scroller.delay_force_height = running_height;
		el.style.height = running_height + "px";
		self.reflow = self.real_reflow;
	};

	self.real_reflow = function() {
		var running_height = 5;
		for (var i = 0; i < songs.length; i++) {
			if (dragging_song != songs[i]) {
				songs[i]._request_y = running_height;
				Fx.delay_css_setting(songs[i].el, "transform", "translateY(" + running_height + "px)");
			}
			running_height += TimelineSong.height;
		}
		el.style.height = running_height + "px";
		scroller.recalculate(running_height);
		scroller.refresh();
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
			$add_class(dragging_song.el, "dragging");
			$add_class(document.body, "unselectable");
			window.addEventListener("mousemove", continue_drag);
			window.addEventListener("mouseup", stop_drag);
			e.preventDefault();
			return false;
		}
	};

	var continue_drag = function(e) {
		var new_y = dragging_song._request_y - (Mouse.y - Mouse.get_y(e));
		var new_index = Math.floor((new_y + (TimelineSong.height * .3)) / TimelineSong.height);
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
		$remove_class(dragging_song.el, "dragging");
		$remove_class(document.body, "unselectable");
		window.removeEventListener("mousemove", continue_drag);
		window.removeEventListener("mouseup", stop_drag);
		dragging_song = null;
		self.reflow();

		if (order_changed) {
			var song_order = "";
			for (var i = 0; i < songs.length; i++) {
				if (i !== 0) song_order += ",";
				song_order += songs[i].data.id;
			}
			API.async_get("order_requests", { "order": song_order });
		}
		order_changed = false;
	};

	return self;
}();