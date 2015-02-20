var Schedule = function() {
	"use strict";
	var self = {};
	self.events = [];
	self.history_events = [];
	self.el = null;

	var first_time = true;
	var sched_next;
	var sched_current;
	var sched_history;
	var current_event;
	var first_scroll_override = true;
	var scrollbar_recalculate_timeout;

	var timeline_scrollbar;
	var timeline_resizer;

	//var now_playing_size = 0;
	var history_open = false;

	self.now_playing_size_calculate = function() {
		//now_playing_size = current_event.el.offsetHeight;
	};

	self.scroll_init = function() {
		self.el = $id("timeline");
		timeline_scrollbar = Scrollbar.create(self.el, $id("timeline_scrollbar"), 30);
		timeline_scrollbar.pending_self_update = true;
		timeline_resizer = Scrollbar.new_resizer($id("timeline_scrollblock"), self.el, $id("timeline_resizer"));
		timeline_resizer.callback = DetailView.on_resize;
	};

	self.stage_padding_check = function() {
		if ($has_class(document.body, "stage_3")) {
			self.el.style.paddingRight = Scrollbar.get_scrollbar_width() + 15 + "px";
		}
		else {
			self.el.style.paddingRight = "";
		}
	};

	self.initialize = function() {
		Prefs.define("sticky_history", [ false, true ]);
		Prefs.define("sticky_history_size", [ 0, 5, 4, 3, 2, 1 ]);
		Prefs.add_callback("sticky_history", self.reflow_history);
		Prefs.add_callback("sticky_history_size", self.reflow_history);

		API.add_callback(open_long_history, "playback_history");

		Prefs.define("show_artists", [ false, true ]);
		Prefs.define("show_losing_songs", [ false, true ]);
		Prefs.add_callback("show_losing_songs", show_losing_songs_callback);
		Prefs.add_callback("show_artists", show_artists_callback);

		API.add_callback(function(json) { sched_current = json; }, "sched_current");
		API.add_callback(function(json) { sched_next = json; }, "sched_next");
		API.add_callback(function(json) { sched_history = json; }, "sched_history");
		API.add_callback(self.update, "_SYNC_COMPLETE");

		API.add_callback(self.register_vote, "vote_result");
		API.add_callback(self.tune_in_voting_allowed_check, "user");
	};

	var show_artists_callback = function(nv) {
		if (nv) {
			$add_class(document.body, "show_artists");
		}
		else {
			$remove_class(document.body, "show_artists");
		}
	};

	var show_losing_songs_callback = function(nv) {
		if (nv) {
			$add_class(self.el, "timeline_showing_losers");
			$remove_class(self.el, "timeline_not_showing_losers");
		}
		else {
			$remove_class(self.el, "timeline_showing_losers");
			$add_class(self.el, "timeline_not_showing_losers");
		}
	};

	self.draw = function() {
		$id("history_header").textContent = $l("previouslyplayed");
		$id("longhist_modal_header").textContent = $l("extended_history_header");
		$id("longhist_link").textContent = $l("extended_history_link");
		$id("longhist_link").addEventListener("click", function(e) { e.stopPropagation(); API.async_get("playback_history", { "per_page": 40 }); });
		$id("history_header_container").addEventListener("click", function(e) { Prefs.change("sticky_history", !Prefs.get("sticky_history")); });

		show_artists_callback(Prefs.get("show_artists"));
		show_losing_songs_callback(Prefs.get("show_losing_songs"));
	};

	self.update = function() {
		var new_events = [];
		var i;

		// Mark everything for deletion - this flag will get updated to false as events do
		var temp_evt = self.el.firstChild;
		var to_delete = [];
		while (temp_evt) {
			if ($has_class(temp_evt, "timeline_event_closing")) {
				to_delete.push(temp_evt);
			}
			if ($has_class(temp_evt, "timeline_event")) {
				temp_evt._pending_delete = true;
			}
			temp_evt = temp_evt.nextSibling;
		}
		for (i = 0; i < to_delete.length; i++) self.el.removeChild(to_delete[i]);

		// with history, [0] is the most recent song, so we start inserting from sched_history.length
		self.history_events = [];
		for (i = sched_history.length - 1; i >= 0; i--) {
			temp_evt = find_and_update_event(sched_history[i]);
			temp_evt.change_to_history();
			temp_evt.hide_header();
			new_events.push(temp_evt);
			self.history_events.push(temp_evt);
			if (!temp_evt.el.parentNode) self.el.appendChild(temp_evt.el);
		}

		current_event = find_and_update_event(sched_current);
		current_event.change_to_now_playing();
		if (first_time) {
			current_event.el.style.marginTop = SCREEN_HEIGHT + "px";
			Fx.delay_css_setting(current_event.el, "marginTop", "10px");
		}
		else {
			current_event.el.style.marginTop = "10px";
		}
		new_events.push(current_event);
		if (!current_event.el.parentNode) self.el.appendChild(current_event.el);

		var previous_evt, sequenced_margin, j;
		for (i = 0; i < sched_next.length; i++) {
			temp_evt = find_and_update_event(sched_next[i]);
			for (j = 0; j <= 5; j++) {
				$remove_class(temp_evt.el, "timeline_next_" + j);
			}
			$add_class(temp_evt.el, "timeline_next_" + i);
			temp_evt.change_to_coming_up();
			if (previous_evt && temp_evt.data.core_event_id && (previous_evt.data.core_event_id === temp_evt.data.core_event_id)) {
				temp_evt.hide_header();
				sequenced_margin = true;
			}
			else {
				temp_evt.show_header();
				sequenced_margin = false;
			}
			new_events.push(temp_evt);
			previous_evt = temp_evt;
			if (first_time) {
				temp_evt.el.style.marginTop = "100%";
				Fx.delay_css_setting(temp_evt.el, "marginTop", sequenced_margin ? "0px" : "30px");
			}
			else if (!temp_evt.el.style.marginTop) {
				temp_evt.el.style.marginTop = SCREEN_HEIGHT + "px";
				Fx.delay_css_setting(temp_evt.el, "marginTop", sequenced_margin ? "0px" : "30px");
			}
			else {
				temp_evt.el.style.marginTop = sequenced_margin ? "0px" : "30px";
			}
			if (!temp_evt.el.parentNode) self.el.appendChild(temp_evt.el);
		}

		// Erase old elements out before we replace the self.events with new_events
		temp_evt = self.el.firstChild;
		while (temp_evt) {
			if ($has_class(temp_evt, "timeline_event") && temp_evt._pending_delete) {
				temp_evt.style.marginTop = "0px";
				temp_evt.style.marginBottom = "0px";
				$add_class(temp_evt, "timeline_event_closing");
			}
			temp_evt = temp_evt.nextSibling;
		}
		self.events = new_events;

		self.reflow_history();

		if (first_time) {
			first_time = false;
		}

		// The now playing bar
		Clock.set_page_title(current_event.songs[0].data.albums[0].name + " - " + current_event.songs[0].data.title, current_event.end);
		if ((current_event.end - Clock.now) > 0) {
			current_event.progress_bar_start();
		}
	};

	self.scrollbar_recalculate = function() {
		if (scrollbar_recalculate_timeout) {
			timeline_scrollbar.pending_self_update = false;
			clearTimeout(scrollbar_recalculate_timeout);
		}
		if (!timeline_scrollbar.pending_self_update || first_scroll_override) {
			first_scroll_override = false;
			timeline_scrollbar.pending_self_update = true;
			scrollbar_recalculate_timeout = setTimeout(function() {
				timeline_scrollbar.recalculate();
				timeline_scrollbar.refresh();
				timeline_scrollbar.pending_self_update = false;
			}, 1600);
		}
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
			evt.el._pending_delete = false;
			return evt;
		}
	};

	self.reflow_history = function() {
		var i;
		if (first_time) {
			for (i = 0; i < self.history_events.length; i++) {
				self.history_events[i].el.style.marginTop = (-TimelineSong.height - ((self.history_events.length - i) * TimelineSong.height)) + "px";
			}
		}

		var sticky_history_size = MOBILE ? 0 : Prefs.get("sticky_history_size");
		if (sticky_history_size == self.history_events.length) {
			$remove_class($id("history_outer_container"), "history_expandable");
		}
		else {
			$add_class($id("history_outer_container"), "history_expandable");
		}

		if (Prefs.get("sticky_history") || (sticky_history_size == self.history_events.length)) {
			$add_class($id("history_outer_container"), "history_open");
			if (first_time) {
				Fx.delay_css_setting(self.history_events[0].el, "marginTop", "0px");
			}
			else {
				self.history_events[0].el.style.marginTop = "0px";
			}
			self.history_events[0].el.style.marginBottom = "0px";
			for (i = 1; i < self.history_events.length; i++) {
				if (first_time) {
					Fx.delay_css_setting(self.history_events[i].el, "marginTop", "0px");
				}
				else {
					self.history_events[i].el.style.marginTop = "0px";
				}
				self.history_events[i].el.style.marginBottom = "0px";
			}
			self.history_events[self.history_events.length - 1].el.style.marginBottom = "30px";
		}
		else {
			$remove_class($id("history_outer_container"), "history_open");
			var mt1 = -(self.history_events.length - sticky_history_size) * TimelineSong.height;
			if (!MOBILE) mt1 -= 30;
			else mt1 += 30;
			if (first_time) {
				Fx.delay_css_setting(self.history_events[0].el, "marginTop", mt1 + "px");
			}
			else {
				self.history_events[0].el.style.marginTop = mt1 + "px";
			}
			var threshold_index = self.history_events.length - sticky_history_size;
			var mt;
			for (i = 1; i < self.history_events.length; i++) {
				if (i < threshold_index) {
					$add_class(self.history_events[i].el, "history_hidden");
				}
				else {
					$remove_class(self.history_events[i].el, "history_hidden");
				}
				mt = threshold_index == i ? 30 : 0;
				self.history_events[i].el.style.marginTop = mt + "px";
				self.history_events[i].el.style.marginBottom = "0px";
			}
			if (MOBILE) {
				self.history_events[self.history_events.length - 1].el.style.marginBottom = "55px";
			}
			else if (threshold_index >= self.history_events.length) {
				self.history_events[self.history_events.length - 1].el.style.marginBottom = "40px";
			}
			else {
				self.history_events[self.history_events.length - 1].el.style.marginBottom = "30px";
			}
		}
		self.scrollbar_recalculate();
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
		if ((which_election < 0) || (which_election >= sched_next.length)) {
			throw({ "is_rw": true, "tl_key": "invalid_hotkey_vote" });
		}

		if (sched_next[which_election].type != "Election") {
			throw({ "is_rw": true, "tl_key": "not_an_election" });
		}

		if (!sched_next[which_election].voting_allowed) {
			throw({ "is_rw": true, "tl_key": "cannot_vote_for_this_now"});
		}

		if ((song_position < 0) || (song_position > sched_next[which_election].songs.length)) {
			throw({ "is_rw": true, "tl_key": "invalid_hotkey_vote"});
		}

		find_event(sched_next[which_election].id).songs[song_position].vote();
	};

	self.tune_in_voting_allowed_check = function(json) {
		var evt, i;
		if (!sched_next) return;
		if (json.tuned_in && (!json.locked || (json.lock_sid == BOOTSTRAP.sid))) {
			for (i = 0; i < sched_next.length; i++) {
				evt = find_event(sched_next[i].id);
				if (evt && (evt.type == "Election")) {
					evt.data.voting_allowed = true;
					evt.enable_voting();
				}
				if (!json.perks) break;
			}
		}
		else {
			for (i = 0; i < sched_next.length; i++) {
				evt = find_event(sched_next[i].id);
				if (evt) {
					evt.data.voting_allowed = false;
					evt.disable_voting();
				}
			}
		}
	};

	self.get_current_song_rating = function() {
		if (current_event && current_event.songs && (current_event.songs.length > 0)) {
			return current_event.songs[0].song_rating.rating_user;
		}
		return null;
	};

	var open_long_history = function(json) {
		var w = $id("longhist_window");
		while (w.firstChild) {
			w.removeChild(w.firstChild);
		}

		var t = SongsTable(json, [ "song_played_at", "title", "album_name", "artists", "rating" ], true);
		w.appendChild(t);

		Menu.show_modal($id("longhist_window_container"));
	};

	return self;
}();
