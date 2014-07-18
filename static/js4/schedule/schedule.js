var Schedule = function() {
	"use strict";
	var self = {};
	self.events = [];
	self.el = null;

	var first_time = true;
	var sched_next;
	var sched_current;
	var current_event;

	var timeline_scrollbar;
	var timeline_resizer;

	self.scroll_init = function() {
		self.el = $id("timeline");
		timeline_scrollbar = Scrollbar.new(self.el, $id("timeline_scrollbar"), 30);
		timeline_resizer = Scrollbar.new_resizer($id("timeline_scrollblock"), self.el, $id("timeline_resizer"));
	};

	self.initialize = function() {
		API.add_callback(function(json) { sched_current = json; }, "sched_current");
		API.add_callback(function(json) { sched_next = json; }, "sched_next");
		API.add_callback(self.update, "_SYNC_COMPLETE");

		API.add_callback(self.register_vote, "vote_result");
		API.add_callback(self.tune_in_voting_allowed_check, "user");
	};

	self.update = function() {
		var new_events = [];
		var i;

		// Mark everything for deletion - this flag will get updated to false as events do
		for (i = 0; i < self.events.length; i++) {
			self.events[i].pending_delete = true;
		}

		current_event = find_and_update_event(sched_current);
		current_event.change_to_now_playing();
		if (first_time) {
			current_event.el.style.marginTop = SCREEN_HEIGHT + "px";
		}
		Fx.delay_css_setting(current_event.el, "marginTop", "10px");
		new_events.push(current_event);
		self.el.appendChild(current_event.el);

		var temp_evt, previous_evt;
		for (i = 0; i < sched_next.length; i++) {
			temp_evt = find_and_update_event(sched_next[i]);
			temp_evt.change_to_coming_up();
			if (previous_evt && (previous_evt.id == temp_evt.id)) {
				temp_evt.hide_header();
			}
			else {
				temp_evt.show_header();
			}
			new_events.push(temp_evt);
			previous_evt = temp_evt;
			if (first_time) {
				temp_evt.el.style.marginTop = "100%";
			}
			else {
				temp_evt.el.style.marginTop = SCREEN_HEIGHT + "px";
			}
			Fx.delay_css_setting(temp_evt.el, "marginTop", "15px");
			self.el.appendChild(temp_evt.el);
		}

		// Erase old elements out before we replace the self.events with new_events
		for (i = 0; i < self.events.length; i++) {
			if (self.events[i].pending_delete) {
				self.events[i].el.style.height = "0px";
				self.events[i].progress_bar_stop();
				Fx.remove_element(self.events[i].el);
			}
		}
		self.events = new_events;

		if (first_time) {
			first_time = false;
		}

		// The now playing bar
		if ((current_event.end - Clock.now) > 0) {
			Clock.set_page_title(current_event.songs[0].data.albums[0].name + " - " + current_event.songs[0].data.title, current_event.end);
			current_event.progress_bar_start();
		}

		timeline_scrollbar.pending_self_update = true;
		setTimeout(function() {
			 timeline_scrollbar.recalculate();
			 timeline_scrollbar.refresh();
		}, 1000);
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
				evt = find_event(sched_next[i].id);
				if (evt) {
					evt.data.voting_allowed = true;
					evt.enable_voting();
				}
				if (!json.perks) break;
			}
		}
		else {
			for (i = 0; i < sched_next.length; i++) {
				evt = find_event(sched_next[i].id)
				if (evt) {
					evt.data.voting_allowed = false;
					evt.disable_voting();
				}
			}
		}
	};

	return self;
}();
