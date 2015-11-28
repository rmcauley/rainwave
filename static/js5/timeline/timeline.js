var Timeline = function() {
	"use strict";
	var self = {};
	var messages = [];
	var el;
	var template;
	var events = [];
	var sched_current;
	var sched_next;
	var sched_history;
	var scroller;
	var history_bar;
	var root_template;

	BOOTSTRAP.on_init.push(function(root_tmpl) {
		root_template = root_tmpl;
		Prefs.define("l_stk", [ false, true ], true);
		Prefs.define("l_stksz", [ 0, 1, 2, 3, 4, 5 ], true);
		Prefs.add_callback("l_stk", self.reflow);
		Prefs.add_callback("l_stksz", self.reflow);

		API.add_callback("sched_current", function(json) { sched_current = json; });
		API.add_callback("sched_next", function(json) { sched_next = json; });
		API.add_callback("sched_history", function(json) { sched_history = json; });
		API.add_callback("_SYNC_COMPLETE", self.update);
		API.add_callback("_SYNC_COMPLETE", self.reflow);
		API.add_callback("_SYNC_COMPLETE", self.voting_allowed_check);
		API.add_callback("playback_history", open_long_history);
		API.add_callback("already_voted", self.handle_already_voted);
		API.add_callback("all_stations_info", check_for_events);
		API.add_callback("user", lock_check);

		template = RWTemplates.timeline.timeline();
		root_template.timeline.parentNode.replaceChild(template.timeline, root_template.timeline);
		root_template.timeline_sizer = template.timeline_sizer;
		el = template.timeline_sizer;
		history_bar = template.history_bar;

		template.longhist_link.addEventListener("click",
			function(e) {
				e.stopPropagation();
				API.async_get("playback_history", { "per_page": 40 });
			}
		);

		template.history_header_link.addEventListener("click",
			function(e) {
				Prefs.change("l_stk", !Prefs.get("l_stk"));
			}
		);

		// Clock.pageclock_bar_function = progress_bar_update;
	});

	BOOTSTRAP.on_draw.push(function() {
		scroller = Scrollbar.create(template.timeline, true);
		// if we don't do this, content can get cut off in the timeline
		// for browsers that don't need the custom scrollbars
		if (!Scrollbar.is_enabled) {
			scroller.set_height_original = scroller.set_height;
			scroller.set_height = function(h) {
				scroller.set_height_original(Math.max(h, Sizing.sizeable_area_height));
			};
		}
		root_template.timeline = scroller.scrollblock;
	});

	self.update = function() {
		var new_events = [];

		for (var i = 0; i < events.length; i++) {
			events[i]._pending_delete = true;
		}

		var z_index = sched_history.length + sched_next.length + 2;

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
			sched_history[i].el.style.zIndex = z_index;
			z_index--;
			new_events.push(sched_history[i]);
			if (i === 0) sched_history[i].height += 8;
		}

		var unappended_events = 0;
		sched_current = find_and_update_event(sched_current);
		sched_current.change_to_now_playing();
		// sched_current.show_header();
		if (sched_current.el.parentNode != el) {
			sched_current.el.style[Fx.transform] = "translateY(" + ((scroller.scroll_height || Sizing.height) + (unappended_events * 2 * Sizing.song_size)) + "px)";
			unappended_events++;
		}
		sched_current.el.style.zIndex = z_index;
		z_index--;
		new_events.push(sched_current);

		var previous_evt = sched_current;
		var is_continuing = false;
		for (i = 0; i < sched_next.length; i++) {
			sched_next[i] = find_and_update_event(sched_next[i]);
			if (previous_evt && sched_next[i].core_event_id && (previous_evt.core_event_id === sched_next[i].core_event_id)) {
				is_continuing = true;
				// sched_next[i].hide_header();
			}
			else {
				is_continuing = false;
				// sched_next[i].show_header();
			}
			sched_next[i].change_to_coming_up(is_continuing);
			if (sched_next[i].el.parentNode != el) {
				sched_next[i].el.style[Fx.transform] = "translateY(" + ((scroller.scroll_height || Sizing.height) + (unappended_events * 2 * Sizing.song_size)) + "px)";
				unappended_events++;
			}
			sched_next[i].el.style.zIndex = z_index;
			z_index--;
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
	};

	var progress_bar_update = function() {
		if (!sched_current) {
			return;
		}
		if ((sched_current.end - Clock.now) <= 0) {
			return;
		}
		var new_val = Math.min(Math.max(Math.floor(((sched_current.end - Clock.now) / (sched_current.songs[0].length - 1)) * 100), 0), 100);
		template.progress_history_inside.style.width = new_val + "%";
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
			return RWEvent(event_json);
		}
		else {
			evt.update(event_json);
			evt._pending_delete = false;
			return evt;
		}
	};

	self.add_message = function(id, text, not_closeable, no_reflow) {
		for (var i = 0; i < messages.length; i++) {
			if (messages[i].id == id) {
				return;
			}
		}

		var msg = {
			"id": id,
			"text": text,
			"closeable": !not_closeable,
			"closed": false
		};
		RWTemplates.timeline.message(msg);
		msg.$t.el.style[Fx.transform] = "translateY(-50px)";
		el.appendChild(msg.$t.el);
		messages.push(msg);
		if (msg.$t.close) {
			msg.$t.close.addEventListener("click", function(e) {
				e.stopPropagation();
				self.close_message(id);
			});
		}
		if (!no_reflow) {
			self.reflow();
		}
		return msg;
	};

	self.close_message = function(id) {
		var msg;
		for (var i = 0; i < messages.length; i++) {
			if (messages[i].id == id) {
				msg = messages[i];
				break;
			}
		}
		if (!msg) {
			return null;
		}
		if (msg.closed) {
			return null;
		}

		msg.closed = true;
		msg.$t.el.style[Fx.transform] = "translateY(-50px)";
		setTimeout(function() {
			if (msg.$t.el.parentNode) {
				msg.$t.el.parentNode.removeChild(msg.$t.el);
			}
		}, 1000);
		self.reflow();

		return msg;
	};

	self.remove_message = function(id) {
		var msg = self.close_message(id);
		if (msg) {
			messages.splice(messages.indexOf(msg), 1);
		}
	};

	self._reflow = function(raftime, reflow_everything) {
		if (!events.length) return;

		var i;
		if (reflow_everything) {
			for (i = 0; i < events.length; i++) {
				events[i].recalculate_height();
				events[i].reflow();
			}
		}

		var running_y = 9;

		for (i = 0; i < messages.length; i++) {
			if (!messages[i].closed) {
				messages[i].$t.el.style[Fx.transform] = "translateY(" + running_y + "px)";
				running_y += Sizing.timeline_message_size + 5;
			}
		}

		template.history_header.style[Fx.transform] = "translateY(" + running_y + "px)";

		var history_size = Prefs.get("l_stk") ? sched_history.length : Prefs.get("l_stksz") || 0;
		if (history_size == sched_history.length) {
			template.history_header.classList.remove("history_expandable");
		}
		else {
			template.history_header.classList.add("history_expandable");
		}

		history_bar.style[Fx.transform] = "translateY(" + running_y + "px)";

		var hidden_events = Math.min(sched_history.length, Math.max(0, sched_history.length - history_size));
		for (i = 0; i < hidden_events && i < sched_history.length; i++) {
			events[i].el.style[Fx.transform] = "translateY(" + (-(((hidden_events - i - 1) * 5 + 1) * Sizing.song_size + 1)) + "px)";
			events[i].el.classList.add("sched_history_hidden");
		}

		running_y += 17;
		var history_gap;
		for (i = hidden_events; i < events.length; i++) {
			if (events[i].history) {
				events[i].el.classList.remove("sched_history_hidden");
			}
			else if (!history_gap) {
				history_gap = true;
				history_bar.style[Fx.transform] = "translateY(" + (running_y + 9) + "px)";
				running_y += 19;
			}
			if (events[i].el.classList.contains("no_progress")) {
				events[i].el.classList.remove("no_progress");
			}
			// if (!events[i].showing_header && (i !== 0) && (!events[i - 1].el.classList.contains("no_header"))) {
			// 	events[i - 1].el.classList.add("no_progress");
			// 	running_y -= Sizing.timeline_header_size;
			// 	running_y += 16;
			// }
			events[i].el.style[Fx.transform] = "translateY(" + running_y + "px)";
			running_y += events[i].height;
			if (Sizing.simple && !events[i].history) running_y += 4;
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
		if (sched_current.songs[0].rating_allowed || User.rate_anything) {
			Rating.do_rating(new_rating, sched_current.songs[0]);
		}
		else {
			throw({ "is_rw": true, "tl_key": "cannot_rate_now" });
		}
	};

	self.vote = function(which_election, song_position) {
		if ((which_election < 0) || (which_election >= sched_next.length)) {
			throw({ "is_rw": true, "tl_key": "invalid_hotkey_vote" });
		}

		if (sched_next[which_election].type != "election") {
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
			return sched_current.songs[0].rating_user;
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

	var do_event = function(json, sid) {
		var url;
		var sname;
		for (var i = 0; i < Stations.length; i++) {
			if (Stations[i].id == sid) {
				url = Stations[i].url;
				sname = Stations[i].name;
			}
		}
		var msg = self.add_message("event_" + sid, $l("special_event_alert", { "station": sname }), false, true);
		// duplicate message
		if (!msg) return;
		var xmsg = document.createElement("span");
		xmsg.textContent = Formatting.event_name(json.event_type, json.event_name);
		msg.$t.message.appendChild(xmsg);
		msg.$t.el.addEventListener("click", function() {
			window.location.href = url;
		});
		msg.$t.el.style.cursor = "pointer";
		return msg;
	};

	var check_for_events = function(json) {
		var sid;
		for (sid in json) {
			if (json[sid] && json[sid].event_name && (sid != User.sid)) {
				do_event(json[sid], sid);
			}
			else if (!json[sid].event_name) {
				self.close_message("event_" + sid);
			}
		}
	};

	var lock_check = function(json) {
		if (json.lock_in_effect && (json.lock_sid != User.sid)) {
			var locked_name, this_name;
			for (var i = 0; i < Stations.length; i++) {
				if (Stations[i].id == json.lock_sid) {
					locked_name = Stations[i].name;
				}
				else if (Stations[i].id == User.sid) {
					this_name = Stations[i].name;
				}
			}
			self.add_message("station_lock", $l("locked_to_station", { "locked_station": locked_name, "this_station": this_name, "lock_counter": json.lock_counter }), true, true);
		}
		else {
			self.remove_message("station_lock");
		}
	};

	return self;
}();
