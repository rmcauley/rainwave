'use strict';

var Schedule = function() {
	var self = {};
	self.events = [];
	self.el = null;

	var sched_next;
	var sched_current;
	var sched_history;
	var time_bar;

	var next_header;
	var current_header;
	var history_header;
	var header_height;

	self.initialize = function() {
		self.el = $id("timeline");
		API.add_callback(function(json) { sched_current = json; }, "sched_current");
		API.add_callback(function(json) { sched_next = json; }, "sched_next");
		API.add_callback(function(json) { sched_history = json; }, "sched_history");
		API.add_callback(update, "_SYNC_COMPLETE");

		history_header = $id("timeline_header_history");
		history_header.textContent = $l("History");
		current_header = $id("timeline_header_now_playing");
		current_header.textContent = $l("Now_Playing");
		next_header = $id("timeline_header_coming_up");
		next_header.textContent = $l("Coming_Up");

		header_height = $measure_el(next_header).height;

		Fx.delay_css_setting($id("timeline_header_history"), "opacity", 1)
		Fx.delay_css_setting($id("timeline_header_now_playing"), "opacity", 1)
		Fx.delay_css_setting($id("timeline_header_coming_up"), "opacity", 1)
	};

	var update = function() {
		var new_events = [];
		var new_current_event;
		var i;
		var padding = 15;
		var running_height = header_height + padding;

		// Mark everything for deletion - this flag will get updated to false as events do
		for (i = 0; i < self.events.length; i++) {
			self.events[i].pending_delete = true;
		}

		// Loading events is next (pulling from already existing self.events or creating new objects as necessary)
		// Appending events to the DOM here is tricky because we have to make sure to retain order, EVEN FOR ITEMS BEING DELETED
		// Items being erased must retain their position in order to smoothly animate out without jerking everything around

		// CAREFUL ABOUT THE ARRAY ORDER WHEN READING THIS
		// sched_next[0] is the next immediate event, sched_next[1] is chronologically after
		// this actually plays nicely into how .insertBefore works in DOM
		var temp_evt;
		for (i = 0; i < sched_next.length; i++) {
			temp_evt = find_and_update_event(sched_next[i]);
			$add_class(temp_evt.el, "timeline_next");
			self.el.insertBefore(temp_evt.el, next_header.nextSibling);
			temp_evt.move_to_y(running_height);
			running_height += temp_evt.height + padding;
			// use splice to put this in at the beginning
			// remember about array orders: new_events is chronological (furthest away -> next -> now -> most recent -> oldest)
			// so the last entry in sched_next must go in index 0 here
			new_events.splice(0, 0, temp_evt);
			Fx.delay_css_setting(temp_evt.el, "opacity", 1);
		}
		running_height += padding;

		Fx.delay_css_setting(current_header, "transform", "translateY(" + running_height + "px)");
		running_height += header_height + padding;

		var element_to_insert_at = temp_evt ? temp_evt.el.nextSibling : next_header;
		temp_evt = find_and_update_event(sched_current);
		$remove_class(temp_evt.el, "timeline_next");
		$add_class(temp_evt.el, "timeline_now_playing");
		self.el.insertBefore(temp_evt.el, element_to_insert_at);
		temp_evt.move_to_y(running_height);
		running_height += temp_evt.height + padding;
		new_events.push(temp_evt);
		temp_evt.change_to_now_playing();
		Clock.set_page_title(temp_evt.name, temp_evt.end);
		new_current_event = temp_evt;
		Fx.delay_css_setting(temp_evt.el, "opacity", 1);
		running_height += padding + header_height + padding;

		Fx.delay_css_setting(history_header, "transform", "translateY(" + running_height + "px)");
		running_height += header_height + padding;

		var o = 0.9;
		for (i = 0; i < sched_history.length; i++) {
			temp_evt = find_and_update_event(sched_history[i]);
			temp_evt.change_to_history()
			$remove_class(temp_evt.el, "timeline_now_playing");
			$add_class(temp_evt.el, "timeline_history");
			self.el.insertBefore(temp_evt.el, new_events[new_events.length - 1].el.nextSibling);
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

		if (time_bar) {
			Fx.remove_element(time_bar);
		}
		if ((new_current_event.end - Clock.time()) > 0) {
			time_bar = $el("div", { "class": "timeline_progress_bar_outside" });
			var time_bar_progress = time_bar.appendChild($el("div", { "class": "timeline_progress_bar_inside"}));
			time_bar_progress.style.width = Math.round(((new_current_event.end - Clock.time()) / new_current_event.data.songs[0].length) * 100) + "%";
			time_bar_progress.style.transition = "width " + (new_current_event.end - Clock.time()) + "s linear";
			Fx.delay_css_setting(time_bar_progress, "width", "0%");
			self.el.insertBefore(time_bar, new_current_event.el.nextSibling);
		}
	};

	var find_and_update_event = function(event_json) {
		for (var i = 0; i < self.events.length; i++) {
			if (event_json.id == self.events[i].id) {
				self.events[i].update(event_json);
				self.events[i].pending_delete = false;
				return self.events[i];
			}
		}
		return Event.load(event_json);
	};

	return self;
}();
