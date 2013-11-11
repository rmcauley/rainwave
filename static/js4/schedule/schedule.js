'use strict';

var Schedule = function() {
	var self = {};
	self.events = [];

	var sched_next;
	var sched_current;
	var sched_history;

	self.initialize = function() {
		API.add_callback(function(json) { sched_current = json; }, "sched_current");
		API.add_callback(function(json) { sched_next = json; }, "sched_next");
		API.add_callback(function(json) { sched_history = json; }, "sched_history");
		API.add_callback(update, "_SYNC_COMPLETE");
	};

	var update = function() {
		var new_events = [];
		var i;

		for (i = 0; i < events.length; i++) {
			events[i].pending_delete = true;
		}

		// reverse order to get HTML order correct on sched_next
		for (i = sched_next.length; i >= 0; i--) {
			new_events.push(find_and_update_event(sched_next[i]));
		}
		new_events.push(find_and_update_event(sched_current));
		for (i = 0; i < sched_history.length; i++) {
			new_events.push(find_and_update_event(sched_history[i]));
		}

		Clock.set_page_title(sched_current.name, sched_current.end);
	};

	var find_and_update_event = function(event_json) {
		for (var i = 0; i < events.length; i++) {
			if (event_json.id == events[i].id) {
				events[i].update(event_json);
				events[i].pending_delete = false;
				return events[i];
			}
		}
		return Event.load(event_json);
	};

	return self;
}();
