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
		radio_rate_anything: false,
		api_key: false
	};
	
	that.ajaxHandle = function(json) {
		var lastinfo = {};
		
		// R4TRANSLATE
		// list_active no longer exists
		// radio_lastnews no longer exists
		// api_key is new ONLY AS PART OF THE INITIAL PAYLOAD at the index page of RW, not as part of the normal payload
		var json2 = {
			// the same as the R3 API:
			"username": json['username'],
			'user_id': json['user_id'],
			'user_new_privmsg': json['user_new_privmsg'],
			'user_avatar': json['user_avatar'],
			'radio_perks': json['radio_perks'],
			'sid': json['sid'],
			'radio_request_position': json['radio_request_position'],
			'radio_rate_anything': json['radio_rate_anything'],
			// funny translations:
			// radio_admin in R4 is a boolean value, previous it was the value of the station ID
			'radio_admin': json['radio_admin'] ? json['sid'] : 0,
			// radio_live_admin used to be something but honestly I don't think I ever used it, but now it's also a boolean!
			'radio_live_admin': json['radio_dj'],
			// direct translations from older variable names:
			'list_id': json['listener_id'],
			'list_voted_entry_id': json['listener_voted_entry'],
			'radio_active_sid': json['radio_locked_sid'],
			'radio_active_until': json['radio_locked_counter'],
			'radio_listenkey': json['radio_listen_key'],
			'radio_request_expiresat': json['radio_request_expires_at'],			
			'radio_tunedin': json['radio_tuned_in'],
			'api_key': json['api_key'],
			'current_activity_allowed': json['listener_lock_in_effect'] ? false : true,
			'radio_statrestricted': json['listener_lock_in_effect']
		};			
		// END TRANSLATE
		
		for (var i in json2) {
			lastinfo[i] = that.p[i];
			that.p[i] = json2[i];
		}
		for (var i in json2) {
			if (json2[i] != lastinfo[i]) that.doCallback(i, json2[i]);
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
	// that.addCallback(lyre.setKey, "api_key");
	lyre.addCallback(that.ajaxHandle, "user");
	
	return that;
}();
