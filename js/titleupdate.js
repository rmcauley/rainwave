var titleupdate = function() {
	var on = false;
	var clockid = 0;
	var sv_ready = false;
	var titlestring = "Loading...";
	var timeleft = 0;
	
	var that = {};
	
	that.updateTitle = function(time) {
		timeleft = time;
		if (!sv_ready) return;
		if (time >= 0) fx.renderF(function() { document.title = "[" + formatNumberToMSS(time) + "] " + titlestring; });
	};

	that.ajaxHandle = function(json) {
		clock.updateClockEnd(clockid, json.sched_endtime);
		
		if (json.sched_type == SCHED_ELEC) titlestring = json.song_data[0].album_name + ": " + json.song_data[0].song_title;
		//else if (json.sched_type == SCHED_JINGLE) titlestring = _l("jingle");
		else if (json.sched_type == SCHED_LIVE) titlestring = json.sched_name;
		else if (json.sched_type == SCHED_ADSET) titlestring = json.ad_data[json.adset_position].ad_title;
		else if (json.sched_type == SCHED_ONESHOT) titlestring = json.song_data[0].album_name + ": " + json.song_data[0].song_title;
		sv_ready = true;
	};
	
	clockid = clock.addClock(that, that.updateTitle, clock.time(), -5);
	lyre.addCallback(that.ajaxHandle, "sched_current");
	
	return that;
}();