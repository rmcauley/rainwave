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
		var history_events_temp = [];
		var history_event_temp;
		var current_event_temp;
		var i;

		// Mark everything for deletion - this flag will get updated to false as events do
		for (i = 0; i < self.events.length; i++) {
			events[i].pending_delete = true;
		}

		// Load events (pulling from already existing self.events or creating new objects as necessary)
		// reverse order on sched_next so array works in HTML order instead of time order
		for (i = sched_next.length - 1; i >= 0; i--) {
			new_events.push(find_and_update_event(sched_next[i]));
		}
		current_event_temp = find_and_update_event(sched_current);
		new_events.push(current_event_temp);
		for (i = 0; i < sched_history.length; i++) {
			history_event_temp = find_and_update_event(sched_history[i]);
			new_events.push(history_event_temp);
			history_events_temp.push(history_event_temp);
		}
		self.events = new_events;

		Clock.set_page_title(sched_current.name, sched_current.end);

		for (i = 0; i < self.events.length; i++) {
			if (self.events[i].pending_delete) {
				self.events[i].el.style.height = "0px";
				Fx.remove_element(self.events[i].el);
			}
			timeline_el.appendChild(self.events[i].el);
		}

		for (i = self.events.length - 1; i >= 0; i--) {
			if (self.events[i].pending_delete) {
				self.events.splice(i, 1);
			}
		}

		// These must go here since they cause reflow and have to happen after they've been appended to the page
		current_event_temp.change_to_now_playing();
		for (i = 0; i < history_events_temp.length; i++) {
			history_events_temp[i].change_to_history(i == 0);
		}

		// Finally, set the height on everything
		for (i = 0; i < self.events.length; i++) {
			Fx.delay_css_setting(self.events[i].el, "height", self.events[i].height + "px");
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
