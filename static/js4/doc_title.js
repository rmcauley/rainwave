'use strict';

var DocTitleUpdater = function() {
	var on = false;
	var clock_id = 0;
	var sv_ready = false;
	var title_string = "Rainwave";

	var self = {};

	self.initialize = function() {
		clock_id = clock.add_clock(false, that.tick, clock.now, -2);
	};

	self.tick = function(time) {
		timeleft = time;
		if (!sv_ready) return;
		if (time >= 0) document.title = "[" + Formatting.minute_clock(time) + "] " + title_string;
	};

	self.update = function(new_title, end_time) {
		Clock.update_clock_end(clock_id, end_time);
		title_string = new_title;
		sv_ready = true;
	};

	return that;
}();
