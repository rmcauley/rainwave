var Timeline = function() {
	"use strict";
	var self = {};
	var el;
	var template;
	var events = [];
	var sched_current;
	var sched_next;
	var sched_history;
	var scroller;
	var history_bar;

	BOOTSTRAP.on_init.push(function(root_template) {
		Prefs.define("sticky_history", [ false, true ]);
		Prefs.define("sticky_history_size", [ 0, 5, 4, 3, 2, 1 ]);
		Prefs.add_callback("sticky_history", self.reflow);
		Prefs.add_callback("sticky_history_size", self.reflow);

		API.add_callback("sched_current", function(json) { sched_current = json; });
		API.add_callback("sched_next", function(json) { sched_next = json; });
		API.add_callback("sched_history", function(json) { sched_history = json; });
		API.add_callback("_SYNC_COMPLETE", self.update);
		API.add_callback("_SYNC_COMPLETE", self.reflow);
		API.add_callback("user", self.voting_allowed_check);
		API.add_callback("playback_history", open_long_history);
		API.add_callback("already_voted", self.handle_already_voted);

		template = RWTemplates.timeline.timeline();
		root_template.timeline.parentNode.replaceChild(template.timeline, root_template.timeline);
		root_template.timeline = template.timeline;
		history_bar = template.history_bar;

		template.longhist_link.addEventListener("click",
			function(e) {
				e.stopPropagation();
				API.async_get("playback_history", { "per_page": 40 });
			}
		);

		template.history_header_link.addEventListener("click",
			function(e) {
				Prefs.change("sticky_history", !Prefs.get("sticky_history"));
			}
		);

		Sizing.add_resize_callback(self.reflow);
	});

	BOOTSTRAP.on_draw.push(function() {
		scroller = Scrollbar.create(template.timeline, true);
		el = scroller.el;
	});

	self.update = function() {
		var new_events = [];

		for (var i = 0; i < events.length; i++) {
			events[i]._pending_delete = true;
		}

		// with history, [0] is the most recent song, so we start inserting from sched_history.length
		self.history_events = [];
		for (i = sched_history.length - 1; i >= 0; i--) {
			sched_history[i] = find_and_update_event(sched_history[i]);
			if (sched_history[i].el.parentNode != el) {
				sched_history[i].$t.progress.parentNode.removeChild(sched_history[i].$t.progress);
			}
			sched_history[i].change_to_history();
			sched_history[i].hide_header();
			if (sched_history[i].el.parentNode != el) {
				sched_history[i].el.style[Fx.transform] = "translateY(" + (-((i * 5 + 1) * Sizing.song_size) - 1) + "px)";
			}
			new_events.push(sched_history[i]);
			if (i === 0) sched_history[i].height += 8;
		}

		var unappended_events = 0;
		sched_current = find_and_update_event(sched_current);
		sched_current.change_to_now_playing();
		sched_current.show_header();
		if (sched_current.el.parentNode != el) {
			sched_current.el.style[Fx.transform] = "translateY(" + ((scroller.scroll_height || Sizing.height) + (unappended_events * 2 * Sizing.song_size)) + "px)";
			unappended_events++;
		}
		new_events.push(sched_current);

		var previous_evt;
		for (i = 0; i < sched_next.length; i++) {
			sched_next[i] = find_and_update_event(sched_next[i]);
			if (previous_evt && sched_next[i].core_event_id && (previous_evt.core_event_id === sched_next[i].core_event_id)) {
				sched_next[i].hide_header();
			}
			else {
				sched_next[i].show_header();
			}
			sched_next[i].change_to_coming_up();
			if (sched_next[i].el.parentNode != el) {
				sched_next[i].el.style[Fx.transform] = "translateY(" + ((scroller.scroll_height || Sizing.height) + (unappended_events * 2 * Sizing.song_size)) + "px)";
				unappended_events++;
			}
			new_events.push(sched_next[i]);
			previous_evt = sched_next[i];
		}

		for (i = 0; i < events.length; i++) {
			if (events[i]._pending_delete) {
				events[i].el.style[Fx.transform] = "translateY(-" + (Sizing.song_size_np + (Sizing.song_size * events[i].songs.length - 1)) + "px)";
				Fx.remove_element(events[i].el);
			}
		}

		events = new_events;

		self.voting_allowed_check();

		for (i = 0; i < events.length; i++) {
			if (events[i].el.parentNode != el) {
				el.appendChild(events[i].el);
			}
		}

		// The now playing bar
		Clock.set_page_title(sched_current.songs[0].albums[0].name + " - " + sched_current.songs[0].title, sched_current.end);
		if ((sched_current.end - Clock.now) > 0) {
			sched_current.progress_bar_start();
		}
	};

	var find_event = function(id) {
		for (var i = 0; i < events.length; i++) {
			if (id == events[i].id) {
				return events[i];
			}
		}
		return null;
	};

	var find_and_update_event = function(event_json) {
		var evt = find_event(event_json.id);
		if (!evt) {
			return Event(event_json);
		}
		else {
			evt.update(event_json);
			evt._pending_delete = false;
			return evt;
		}
	};

	var get_history_size = function() {
		return Prefs.get("sticky_history") ? sched_history.length: Prefs.get("sticky_history_size") || 0;
	};

	self._reflow = function(raftime, test) {
		if (!events.length) return;

		var history_size = Prefs.get("sticky_history") ? sched_history.length: Prefs.get("sticky_history_size") || 0;
		if (history_size == sched_history.length) {
			template.history_header.classList.remove("history_expandable");
		}
		else {
			template.history_header.classList.add("history_expandable");
		}

		var hidden_events = Math.min(sched_history.length, Math.max(0, test || sched_history.length - history_size));
		for (var i = 0; i < hidden_events && i < sched_history.length; i++) {
			events[i].el.style[Fx.transform] = "translateY(" + (-(((hidden_events - i - 1) * 5 + 1) * Sizing.song_size + 1)) + "px)";
		}

		var running_y = !Sizing.simple || Sizing.mobile ? 30 : 28;
		var history_gap;
		for (i = hidden_events; i < events.length; i++) {
			if (!events[i].history && !history_gap) {
				history_gap = true;
				history_bar.style[Fx.transform] = "translateY(" + (running_y + 9) + "px)";
				running_y += 20;
			}
			events[i].el.style[Fx.transform] = "translateY(" + running_y + "px)";
			running_y += events[i].height;
			if (Sizing.simple && !events[i].history) running_y += 7;
		}

		scroller.set_height(running_y);
	};

	self.reflow = function() {
		setTimeout(self._reflow, 1);
	};

	self.handle_already_voted = function(json) {
		if (!events) return;
		for (var i = 0; i < json.length; i++) {
			self.register_vote(json[i][0], json[i][1]);
		}
	};

	self.register_vote = function(event_id, entry_id) {
		if (!events) return;
		var i, j;
		for (i = 0; i < events.length; i++) {
			if (events[i].id == event_id) {
				for (j = 0; j < events[i].songs.length; j++) {
					if (events[i].songs[j].entry_id == entry_id) {
						events[i].songs[j].register_vote();
					}
				}
			}
		}
	};

	self.rate_current_song = function(new_rating) {
		if (sched_current.songs[0].data.rating_allowed) {
			sched_current.songs[0].rate(new_rating);
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

		sched_next[which_election].songs[song_position].vote();
	};

	self.voting_allowed_check = function() {
		if (!sched_next) return;
		if (!sched_next.length) return;
		for (var i = 0; i < sched_next.length; i++) {
			if (!sched_next[i].disable_voting) {
				// we haven't finished loading everything yet, short-circuit
				return;
			}
			else if ((sched_next[i].type != "election") || (sched_next[i].songs.length <= 1)) {
				sched_next[i].disable_voting();
			}
			else if (User.locked && (User.lock_sid != User.sid)) {
				sched_next[i].disable_voting();
			}
			else if ((i === 0) && User.tuned_in) {
				sched_next[i].enable_voting();
			}
			else if (User.tuned_in && User.perks) {
				sched_next[i].enable_voting();
			}
			else {
				sched_next[i].disable_voting();
			}
		}
	};

	self.get_current_song_rating = function() {
		if (sched_current && sched_current.songs && (sched_current.songs.length > 0)) {
			return sched_current.songs[0].song_rating.rating_user;
		}
		return null;
	};

	var open_long_history = function(json) {
		// var w = $id("longhist_window");
		// while (w.firstChild) {
		// 	w.removeChild(w.firstChild);
		// }

		// var t = SongsTable(json, [ "song_played_at", "title", "album_name", "artists", "rating" ], true);
		// w.appendChild(t);

		// Menu.show_modal($id("longhist_window_container"));
	};

	return self;
}();
