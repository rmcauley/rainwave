'use strict';

var Schedule = function() {
	var self = {};
	self.events = [];
	var timeline_el;

	var sched_next;
	var sched_current;
	var sched_history;

	self.initialize = function() {
		timeline_el = $id("timeline");
		API.add_callback(function(json) { sched_current = json; }, "sched_current");
		API.add_callback(function(json) { sched_next = json; }, "sched_next");
		API.add_callback(function(json) { sched_history = json; }, "sched_history");
		API.add_callback(update, "_SYNC_COMPLETE");
	};

	var update = function() {
		var new_events = [];
		var i;

		for (i = 0; i < self.events.length; i++) {
			events[i].pending_delete = true;
		}

		// reverse order to get HTML order correct on sched_next
		for (i = sched_next.length - 1; i >= 0; i--) {
			new_events.push(find_and_update_event(sched_next[i]));
		}
		new_events.push(find_and_update_event(sched_current));
		for (i = 0; i < sched_history.length; i++) {
			new_events.push(find_and_update_event(sched_history[i]));
		}
		self.events = new_events;

		Clock.set_page_title(sched_current.name, sched_current.end);

		for (i = 0; i < self.events.length; i++) {
			if (self.events[i].pending_delete) {
				self.events[i].el.style.height = 0;
				Fx.remove_element(self.events[i].el);
			}
			else {
				Fx.delay_css_setting(self.events[i].el, "height", self.events[i].height)
			}
			timeline_el.appendChild(self.events[i].el);
		}

		for (i = self.events.length - 1; i >= 0; i--) {
			if (self.events[i].pending_delete) {
				self.events.splice(i, 1);
			}
		}
	};

	var find_and_update_event = function(event_json) {
		for (var i = 0; i < self.events.length; i++) {
			if (event_json.id == self.events[i].id) {
				self.events[i].update(event_json);
				self.events[i].pending_delete = false;
				return events[i];
			}
		}
		return Event.load(event_json);
	};

	return self;
}();
