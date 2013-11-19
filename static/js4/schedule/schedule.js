'use strict';

var Schedule = function() {
	var self = {};
	self.events = [];
	self.el = null;

	var sched_next;
	var sched_current;
	var sched_history;
	var time_bar;

	self.initialize = function() {
		self.el = $id("timeline");
		API.add_callback(function(json) { sched_current = json; }, "sched_current");
		API.add_callback(function(json) { sched_next = json; }, "sched_next");
		API.add_callback(function(json) { sched_history = json; }, "sched_history");
		API.add_callback(update, "_SYNC_COMPLETE");
	};

	var update = function() {
		var new_events = [];
		var new_current_event;
		var i;

		// Mark everything for deletion - this flag will get updated to false as events do
		for (i = 0; i < self.events.length; i++) {
			self.events[i].pending_delete = true;
		}

		// Loading events is next (pulling from already existing self.events or creating new objects as necessary)
		// Appending events to the DOM here is tricky because we have to make sure to retain order, EVEN FOR ITEMS BEING DELETED
		// Items being erased must retain their position in order to smoothly animate out without jerking everything around

		// reverse order on sched_next so array works in HTML order instead of time order
		var temp_evt;
		for (i = sched_next.length - 1; i >= 0; i--) {
			temp_evt = find_and_update_event(sched_next[i]);
			if (i == sched_next.length - 1) {
				self.el.insertBefore(temp_evt.el, self.el.firstChild);
			}
			else {
				self.el.insertBefore(temp_evt.el, new_events[new_events.length - 1].el.nextSibling);
			}
			new_events.push(temp_evt);
		}

		temp_evt = find_and_update_event(sched_current);
		self.el.insertBefore(temp_evt.el, new_events[new_events.length - 1].el.nextSibling);
		new_events.push(temp_evt);
		temp_evt.change_to_now_playing();
		Clock.set_page_title(temp_evt.name, temp_evt.end);
		new_current_event = temp_evt;

		for (i = 0; i < sched_history.length; i++) {
			temp_evt = find_and_update_event(sched_history[i]);
			temp_evt.change_to_history(i == 0);
			self.el.insertBefore(temp_evt.el, new_events[new_events.length - 1].el.nextSibling);
			new_events.push(temp_evt);
		}

		// Erase old elements out before we replace the self.events with new_events
		for (i = 0; i < self.events.length; i++) {
			if (self.events[i].pending_delete) {
				self.events[i].el.style.height = "0px";
				Fx.remove_element(self.events[i].el);
			}
		}
		self.events = new_events;

		// Finally, set the height on everything
		for (i = 0; i < self.events.length; i++) {
			Fx.delay_css_setting(self.events[i].el, "height", self.events[i].height + "px");
		}

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
