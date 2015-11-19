var Clock = function() {
	"use strict";
	var interval = 0;
	var timediff = 0;
	var ready = false;
	var page_title;
	var page_title_end;
	var force_sync_ok = false;
	var original_title = document.title;

	var self = {};
	self.now = 0;
	self.pageclock = null;
	self.pageclock_bar_function = null;

	BOOTSTRAP.on_init.push(function(template) {
		Prefs.define("show_rating_in_titlebar");
		Prefs.define("show_clock_in_titlebar", [ true, false ]);
		Prefs.define("show_title_in_titlebar", [ true, false ]);
		API.add_callback("api_info", self.resync);

		if (interval === 0) {
			interval = setInterval(self.loop, 1000);
		}
	});

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

		if (self.pageclock && (page_title_end - self.now >= 0)) {
			self.pageclock.textContent = c;
		}

		if (self.pageclock_bar_function && !document[visibilityEventNames.hidden]) {
			self.pageclock_bar_function(page_title_end, self.now);
		}

		// what to do if things appear broken
		// if the station isn't on a DJ pause, immediately restart the connection
		// this works for flaky routers/ISPs
		if (!API.paused && force_sync_ok && (page_title_end - self.now < -10)) {
			force_sync_ok = false;
			API.force_sync();
			return;
		}
		// check every 3 minutes regardless as a backup
		else if (!force_sync_ok && (Math.abs(page_title_end - self.now) % 20 === 0)) {
			API.force_sync();
			return;
		}

		if (Sizing.simple && (!Prefs.get("show_title_in_titlebar") || !page_title || MOBILE  || !User.tuned_in)) {
			if (document.title != original_title) document.title = original_title;
			return;
		}

		var this_page_title = page_title;
		if (Prefs.get("show_rating_in_titlebar")) {
			var rating = Timeline.get_current_song_rating();
			if (rating) {
				if (rating * 10 % 10 === 0) rating = rating + ".0";
				this_page_title = "[" + rating + "] " + this_page_title;
			}
			else if (rating === 0) {
				this_page_title = "*** " + this_page_title;
			}
		}
		if (Prefs.get("show_clock_in_titlebar")) {
			this_page_title = "[" + c + "] " + this_page_title;
		}
		if (this_page_title != document.title) document.title = this_page_title;
	};

	return self;
}();
