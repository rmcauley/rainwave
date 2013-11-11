'use strict';

var Clock = function() {
	var clocks = {};
	var interval = 0;
	var timediff = 0;
	var ready = false;
	var page_title;
	var page_title_end;
	var max_id = 0;

	var self = {};
	self.now = 0;

	self.initialize = function() {
		API.add_callback(self.resync, "api_info");
	};

	self.time = function() {
		return Math.round(Date().getTime() / 1000);
	};

	self.get_time_diff = function() {
		return timediff;
	}

	self.hi_res_time = function() {
		return Date().getTime();
	};

	self.resync = function(json) {
		timediff = json.time - self.time() + 2;
		ready = true;

		for (var i in clocks) {
			if (!document.getElementById("_clock_" + i)) {
				delete(clocks[i]);
			}
		}
	};

	self.set_page_title = function(new_title, new_end_time) {
		page_title = new_title;
		page_title_end = new_end_time;
	}

	self.loop = function() {
		if (ready == false) return;
		self.now = self.time() + timediff;

		for (var i in clocks) {
			clocks[i].textContent = Formatting.minute_clock(clocks[i]._clock_end - self.now);
		}

		if (page_title) {
			document.title = "[" + Formatting.minute_clock(page_title_end - self.now) + "] " + page_title;
		}
	};

	self.add_clock = function(el, end_time) {
		max_id++;
		el.setAttribute('id', "_clock_" + max_id);
		el._clock_end = end_time;
	};

	if (interval == 0) {
		interval = setInterval(self.loop, 1000);
	}

	return self;
}();
