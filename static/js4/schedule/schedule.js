var Schedule = function() {
	"use strict";
	var self = {};
	self.events = [];
	self.el = null;

	var sched_next;
	var sched_current;
	var sched_history;
	var time_bar;
	var time_bar_progress;
	var time_bar_progress_timer = false;
	var current_event;

	var next_headers = [];
	var current_header;
	var history_header;
	var history_bar;
	var header_height;

	var timeline_scrollbar;

	self.initialize = function() {
		self.el = $id("timeline");
		API.add_callback(function(json) { sched_current = json; }, "sched_current");
		API.add_callback(function(json) { sched_next = json; }, "sched_next");
		API.add_callback(function(json) { sched_history = json; }, "sched_history");
		API.add_callback(self.update, "_SYNC_COMPLETE");

		API.add_callback(self.register_vote, "vote_result");
		API.add_callback(self.tune_in_voting_allowed_check, "user");

		history_header = $id("timeline_header_history");
		history_header.textContent = $l("History");
		current_header = $id("timeline_header_now_playing");
		current_header.textContent = $l("Now_Playing");
		time_bar = $id("timeline_header_now_playing_bar");
		time_bar_progress = Fx.legacy_effect(Fx.CSSNumeric, $id("timeline_header_now_playing_bar_inside"), 700, "width", "%");
		history_bar = $id("timeline_header_history_bar");

		header_height = $measure_el(history_header).height - 8;	// -8 ties into the .header_height definition in timeline.css

		Fx.delay_css_setting($id("timeline_header_history"), "opacity", 1);
		Fx.delay_css_setting($id("timeline_header_now_playing"), "opacity", 1);
		Fx.delay_css_setting(history_bar, "opacity", 1);
		Fx.delay_css_setting(time_bar, "opacity", 1);

		timeline_scrollbar = Scrollbar.new(self.el);
		timeline_scrollbar.auto_resize = false;
		timeline_scrollbar.add_resizer("timeline", 20, 600);
	};

	var shift_next_header = function() {
		if (next_headers.length == 0) {
			var new_header = $el("a", { "class": "timeline_header" });
			Fx.delay_css_setting(new_header, "opacity", 1);
			var new_bar = $el("div", { "class": "timeline_header_bar" });
			Fx.delay_css_setting(new_bar, "opacity", 1);
			return { "header": new_header, "bar": new_bar };
		}
		return next_headers.shift();
	};

	var set_header_text = function(default_text, header, evt) {
		if (evt.type == "OneUp") {
			header.textContent = default_text + " - " + evt.name + " " + $l("Power_Hour");
		}
		else if ($l_has(evt.type)) {
			header.textContent = default_text + " - " + $l(evt.type);
			if (evt.name) {
				header.textContent += " - " + evt.name;
			}
		}
		else if (evt.name) {
			header.textContent = default_text + " - " + evt.name;
		}
		else {
			header.textContent = default_text;
		}
		if (evt.data.url) {
			header.setAttribute("href", evt.data.url);
			header.setAttribute("target", "_blank");
			Formatting.linkify_external(header);
			$add_class(header, "link");
		}
		else {
			Formatting.unlinkify(header);
			header.removeAttribute("href");
			header.removeAttribute("target");
			$remove_class(header, "link");
		}
	};

	self.reflow = function() {
		if (!header_height) return;
		header_height = $measure_el(history_header).height - 8;	// -8 ties into the .header_height definition in timeline.css
		for (var i in self.events) {
			self.events[i].reflow();
		}
		self.update();
	};

	self.update = function() {
		var new_events = [];
		var i;
		var padding = 15;
		var header_padding_pullback = 6;
		var running_height = 5;
		var time_bar_y;

		// Mark everything for deletion - this flag will get updated to false as events do
		for (i = 0; i < self.events.length; i++) {
			self.events[i].pending_delete = true;
		}

		set_header_to_top_zindex();

		// Loading events is next (pulling from already existing self.events or creating new objects as necessary)
		// Appending events to the DOM here is tricky because we have to make sure to retain order, EVEN FOR ITEMS BEING DELETED
		// Items being erased must retain their position in order to smoothly animate out without jerking everything around

		// CAREFUL ABOUT THE ARRAY ORDER WHEN READING THIS
		// sched_next[0] is the next immediate event, sched_next[1] is chronologically after
		// this actually plays nicely into how .insertBefore works in DOM
		var new_next_headers = [];
		var this_next_header;
		var temp_evt;
		for (i = sched_next.length - 1; i >= 0; i--) {
			temp_evt = find_and_update_event(sched_next[i]);
			temp_evt.change_to_coming_up();
			// event that's furthest away in the future, we need a header here for sure
			if (i == sched_next.length - 1) {
				this_next_header = shift_next_header();
			}
			// if there's no name, if the types don't match, or the names don't match, use a header
			else if ((sched_next[i].type == "Election") || !sched_next[i].name || (sched_next[i].type != sched_next[i + 1].type) || (sched_next[i].name != sched_next[i + 1].name)) {
				this_next_header = shift_next_header();
			}
			else {
				this_next_header = null;
			}
			if (this_next_header) {
				set_header_text($l("Coming_Up"), this_next_header.header, temp_evt);
				new_next_headers.push(this_next_header);
				Fx.delay_css_setting(this_next_header.header, "transform", "translateY(" + running_height + "px");
				running_height += header_height + 3;
				Fx.delay_css_setting(this_next_header.bar, "transform", "translateY(" + running_height + "px");
				running_height += padding - header_padding_pullback;
				if (!this_next_header.header.parentNode) self.el.appendChild(this_next_header.header);
				if (!this_next_header.bar.parentNode) self.el.appendChild(this_next_header.bar);
			}
			temp_evt.move_to_y(running_height);
			if (!temp_evt.el.parentNode) self.el.appendChild(temp_evt.el);
			running_height += temp_evt.height;
			if (this_next_header) {
				running_height += padding;
			}
			else {
				running_height += 5;
			}
			new_events.push(temp_evt);
			Fx.delay_css_setting(temp_evt.el, "opacity", 1);
		}

		// Remove old headers
		for (i = 0; i < next_headers.length; i++) {
			Fx.remove_element(next_headers[i]);
		}
		next_headers = new_next_headers;
		
		// Now playing header positioning, and setup the z-index correction chain
		Fx.chain_transition_css(current_header, "transform", "translateY(" + running_height + "px)", set_header_to_normal_zindex);
		time_bar_y = running_height + header_height + 3;
		running_height = time_bar_y + padding - header_padding_pullback;

		// Current event positioning and updating
		temp_evt = find_and_update_event(sched_current);
		current_event = temp_evt;
		set_header_text($l("Now_Playing"), current_header, temp_evt);
		if (!temp_evt.el.parentNode) self.el.appendChild(temp_evt.el);
		temp_evt.change_to_now_playing();
		temp_evt.move_to_y(running_height);
		running_height += temp_evt.height + padding;
		new_events.push(temp_evt);
		Fx.delay_css_setting(temp_evt.el, "opacity", 1);

		// History header positioning
		Fx.delay_css_setting(history_header, "transform", "translateY(" + running_height + "px)");
		running_height += header_height + 3;
		Fx.delay_css_setting(history_bar, "transform", "translateY(" + running_height + "px");
		running_height += padding - header_padding_pullback;

		var o = 1.0;
		for (i = 0; i < sched_history.length; i++) {
			temp_evt = find_and_update_event(sched_history[i]);
			temp_evt.change_to_history();
			$remove_class(temp_evt.el, "timeline_now_playing");
			$add_class(temp_evt.el, "timeline_history");
			if (!temp_evt.el.parentNode) self.el.appendChild(temp_evt.el);
			new_events.push(temp_evt);
			if (o > 0.6) {
				o -= 0.1;
			}
			temp_evt.move_to_y(running_height);
			running_height += temp_evt.height;
			Fx.delay_css_setting(temp_evt.el, "opacity", o);
		}

		// Erase old elements out before we replace the self.events with new_events
		for (i = 0; i < self.events.length; i++) {
			if (self.events[i].pending_delete) {
				self.events[i].el.style.height = "0px";
				Fx.remove_element(self.events[i].el);
			}
		}
		self.events = new_events;

		// The now playing bar
		if ((current_event.end - Clock.now) > 0) {
			Clock.set_page_title(current_event.songs[0].data.albums[0].name + " - " + current_event.songs[0].data.title, current_event.end);

			if (time_bar_progress_timer) clearInterval(time_bar_progress_timer);
			time_bar_progress.element.style.transition = "";
			time_bar_progress.onComplete = start_time_bar_progress;
			time_bar_progress.start(((current_event.end - Clock.now) / (current_event.data.songs[0].length - 1)) * 100);
		}
		Fx.delay_css_setting(time_bar, "transform", "translateY(" + time_bar_y + "px)");

		timeline_scrollbar.update_scroll_height(running_height);
	};

	var start_time_bar_progress = function() {
		time_bar_progress.element.style.transition = "none";
		time_bar_progress.onComplete = false;
		time_bar_progress_timer = setInterval(update_time_bar_progress, 1000);
	};

	var update_time_bar_progress = function() {
		var new_val = ((current_event.end - Clock.now) / (current_event.data.songs[0].length - 1)) * 100;
		if (new_val <= 0) {
			if (time_bar_progress_timer) clearInterval(time_bar_progress_timer);
			time_bar_progress_timer = false;
			time_bar_progress.set(0);
		}
		else {
			time_bar_progress.set(new_val);
		}
	};

	var set_header_to_top_zindex = function() {
		for (var i = 0; i < next_headers.length; i++) {
			next_headers[i].header.style.zIndex = 2;
			next_headers[i].bar.style.zIndex = 2;
		}
		history_header.style.zIndex = 2;
		current_header.style.zIndex = 2;
		time_bar.style.zIndex = 2;
		history_bar.style.zIndex = 2;
	};

	var set_header_to_normal_zindex = function() {
		for (var i = 0; i < next_headers.length; i++) {
			next_headers[i].header.style.zIndex = "auto";
			next_headers[i].bar.style.zIndex = "auto";
		}
		history_header.style.zIndex = "auto";
		current_header.style.zIndex = "auto";
		time_bar.style.zIndex = "auto";
		history_bar.style.zIndex = "auto";
	};

	var find_event = function(id) {
		for (var i = 0; i < self.events.length; i++) {
			if (id == self.events[i].id) {
				return self.events[i];
			}
		}
		return null;
	};

	var find_and_update_event = function(event_json) {
		var evt = find_event(event_json.id);
		if (!evt) {
			return Event.load(event_json);	
		}
		else {
			evt.update(event_json);
			evt.pending_delete = false;
			return evt;
		}
	};

	self.register_vote = function(json) {
		if (!json.success) return;
		for (var i = 0; i < self.events.length; i++) {
			if (self.events[i].id == json.elec_id) {
				self.events[i].register_vote(json.entry_id);
			}
		}
	};

	self.rate_current_song = function(new_rating) {
		if (current_event.songs[0].data.rating_allowed) {
			current_event.songs[0].rate(new_rating);
		}
		else {
			throw({ "is_rw": true, "tl_key": "cannot_rate_now" });
		}
	};

	self.vote = function(which_election, song_position) {
		var i = self.events.indexOf(current_event) - 1;
		while ((i >= 0) && (which_election > 0)) {
			if ((self.events[i].data.type == "Election") && self.events[i].data.voting_allowed) {
				which_election -= 1;
			}
			i -= 1;
		}
		if ((i >= 0) && (self.events[i].data.type == "Election") && self.events[i].data.voting_allowed) {
			if (self.events[i].songs.length > song_position) {
				self.events[i].songs[song_position].vote();
				return;
			}
			else {
				throw({ "is_rw": true, "tl_key": "invalid_hotkey_vote" });
			}
		}
		throw({ "is_rw": true, "tl_key": "invalid_hotkey_vote" });
	};

	self.tune_in_voting_allowed_check = function(json) {
		var evt, i;
		if (!sched_next) return;
		if (json.tuned_in && (!json.locked || (json.lock_sid == BOOTSTRAP.sid))) {
			for (i = 0; i < sched_next.length; i++) {
				evt = find_event(sched_next[i].id)
				evt.data.voting_allowed = true;
				evt.enable_voting();
				if (!json.perks) break;
			}
		}
		else {
			for (i = 0; i < sched_next.length; i++) {
				evt = find_event(sched_next[i].id)
				evt.data.voting_allowed = false;
				evt.disable_voting();
			}
		}
	};

	return self;
}();
