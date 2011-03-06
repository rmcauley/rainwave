var clock = function() {
	var clocks = {};
	var interval = 0;
	var timediff = 0;
	var ready = false;
	var maxid = 0;
	
	var that = {};
	that.now = 0;

	that.time = function() {
		var newdate = new Date();
		return Math.round(newdate.getTime() / 1000);
	};
	
	that.getTimeDiff = function() {
		return timediff;
	}
	
	that.hiResTime = function() {
		var newdate = new Date();
		return newdate.getTime();
	};
	
	that.clockSync = function(newtime) {
		var count = 0;
		for (var i in clocks) count++;
		timediff = newtime - that.time();
		that.now = that.time() + timediff;
		ready = true;
	};
	
	that.loop = function() {
		if (ready == false) return;
		that.now = that.time() + timediff;
		for (var cb in clocks) {
			try {
				var clocktime = clocks[cb].end - that.now + clocks[cb].offset;
				clocks[cb].func.call(clocks[cb].obj, clocktime);
			}
			catch(err) {
				clearInterval(interval);
				errorcontrol.jsError(err);
			}
		}
	};
	
	that.updateClockEnd = function(idx, newend) {
		if (clocks[idx]) clocks[idx].end = newend;
	};

	that.addClock = function(object, method, end, offset) {
		if (typeof(offset) == "undefined") offset = 0;
		var newclock = {
			func: method,
			obj: object,
			end: end,
			finished: false,
			offset: offset
		};
		var cid = maxid;
		maxid++;
		clocks[cid] = newclock;
		return cid;
	};
	
	that.eraseClock = function(idx) {
		if (clocks[idx]) delete(clocks[idx]);
	};
	
	that.now = that.time() + timediff;
	lyre.clockSync = that.clockSync;
	if (interval == 0) {
		interval = setInterval(that.loop, 1000);
	}

	return that;
}();