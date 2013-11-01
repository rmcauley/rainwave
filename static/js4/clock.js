'use strict';

var Clock = function() {
	var clocks = {};
	var interval = 0;
	var timediff = 0;
	var ready = false;
	var maxid = 0;

	var that = {};
	that.now = 0;

	that.initialize = function() {
		API.add_callback(that.resync, "api_info");
	};

	that.time = function() {
		var newdate = new Date();
		return Math.round(newdate.getTime() / 1000);
	};

	that.get_time_diff = function() {
		return timediff;
	}

	that.hi_res_time = function() {
		var newdate = new Date();
		return newdate.getTime();
	};

	that.resync = function(json) {
		timediff = json.time - that.time();
		that.now = that.time() + timediff;
		ready = true;
	};

	that.loop = function() {
		if (ready == false) return;
		that.now = that.time() + timediff;
		var cb;
		for (cb in clocks) {
			try {
				clocks[cb].func(clocks[cb].end - that.now + clocks[cb].offset);
			}
			catch(err) {
				clearInterval(interval);
				errorcontrol.jsError(err);
			}
		}
		if ((that.now % 60) == 0) {
			var c = 0;
			for (var cb in clocks) {
				if (clocks[cb].el && !document.getElementById("clock_" + cb)) {
					delete(clocks[cb]);
				}
				else c++;
			}
		}
	};

	that.update_clock_end = function(idx, newend) {
		if (clocks[idx]) clocks[idx].end = newend;
	};

	that.add_clock = function(el, method, end, offset) {
		maxid++;
		if (typeof(offset) == "undefined") offset = 0;
		if (el) el.setAttribute("id", "clock_" + maxid);
		var newclock = {
			"el": el,
			"func": method,
			"end": end,
			"finished": false,
			"offset": offset
		};
		clocks[maxid] = newclock;
		return maxid;
	};

	that.now = that.time() + timediff;
	if (interval == 0) {
		interval = setInterval(that.loop, 1000);
	}

	return that;
}();
