var user = function() {
	var callbacks = [];
	var maxid = 0;
	
	var that = {};
	that.p = {
		user_id: PRELOADED_USER_ID,
		username: "",
		user_new_privmsg: 0,
		user_avatar: "images/blank.png",
		radio_lastnews: -1,
		radio_statrestricted: 0,
		radio_perks: 0,
		radio_tunedin: 0,
		sid: 0,
		current_activity_allowed: false,
		radio_admin: 0,
		radio_live_admin: 0,
		radio_request_expiresat: 0,
		radio_request_position: 0,
		radio_listenkey: false,
		list_active: false,
		list_id: 0,
		list_voted_entry_id: false,
		radio_active_sid: 0,
		radio_active_until: 0,
		radio_rate_anything: false
	};
	
	that.ajaxHandle = function(json) {
		json.current_activity_allowed = ((json.radio_tunedin == 1) && (json.radio_statrestricted == 0)) ? true : false;
		var lastinfo = {};
		for (var i in json) {
			lastinfo[i] = that.p[i];
			that.p[i] = json[i];
		}
		for (var i in json) {
			if (json[i] != lastinfo[i]) that.doCallback(i, json[i]);
		}
	};
	
	that.doCallback = function(key, value) {
		if (typeof(callbacks[key]) != "undefined") {
			for (var cb in callbacks[key]) {
				callbacks[key][cb](value);
			}
		}
	};

	that.addCallback = function(method, datum) {
		if (typeof(callbacks[datum]) == "undefined") callbacks[datum] = [];
		callbacks[datum][maxid] = method;
		maxid++;
		return maxid - 1;
	};
	
	that.deleteCallback = function(datum, id) {
		delete(that.callbacks[datum][id]);
	};
	
	that.addCallback(lyre.setUserID, "user_id");	
	that.addCallback(lyre.setKey, "api_key");
	lyre.addCallback(that.ajaxHandle, "user");
	
	return that;
}();
