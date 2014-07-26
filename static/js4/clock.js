var Clock = function() {
	"use strict";
	var interval = 0;
	var timediff = 0;
	var ready = false;
	var page_title;
	var page_title_end;
	var max_id = 0;
	var force_sync_ok = false;

	var self = {};
	self.now = 0;
	self.pageclock = null;
	self.pageclock_bar_function = null;

	self.initialize = function() {
		API.add_callback(self.resync, "api_info");
	};

	self.time = function() {
		return Math.round(new Date().getTime() / 1000);
	};

	self.get_time_diff = function() {
		return timediff;
	};

	self.hi_res_time = function() {
		return new Date().getTime();
	};

	self.resync = function(json) {
		timediff = json.time - self.time() + 2;
		ready = true;

		self.now = self.time() + timediff;
	};

	self.set_page_title = function(new_title, new_end_time) {
		if ((new_end_time != page_title_end) && (new_end_time > self.now)) {
			force_sync_ok = true;
		}
		page_title = new_title;
		page_title_end = new_end_time;
	};

	self.loop = function() {
		if (ready === false) return;
		if (page_title_end < 0 || isNaN(page_title_end - self.now)) return;
		self.now = self.time() + timediff;

		var c = Formatting.minute_clock(page_title_end - self.now);
		if (page_title) {
			document.title = "[" + c + "] " + page_title;
			if (force_sync_ok && (page_title_end - self.now < -10)) {
				force_sync_ok = false;
				API.force_sync();
			}
		}

		if (self.pageclock) {
			self.pageclock.textContent = c;
		}

		if (self.pageclock_bar_function) { 
			self.pageclock_bar_function(page_title_end, self.now);
		}
	};

	if (interval === 0) {
		interval = setInterval(self.loop, 1000);
	}

	return self;
}();
