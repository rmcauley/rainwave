var ratingcontrol = function() {
	var callbacks = [];
	var maxid = 0;
	
	var that = {};
	that.hideuntilrated = false;

	that.loginUpdate = function(result) {
		log.log("RatingControl", 0, "Count: " + callbacks.length);
	};
	
	that.ratingUpdate = function(result) {
		if (result.song_id) {
			var callbackcount = 0;
			for (var i in callbacks) {
				callbackcount++;
				if ((callbacks[i].category == "song") && (callbacks[i].id == result.song_id)) {
					if (result.code == 1) callbacks[i].ratingConfirm.call(callbacks[i], result.song_rating);
					else callbacks[i].ratingBad.call(callbacks[i], result.song_rating);
				}
				if ((result.code == 1) && (result.album_id) && (callbacks[i].category == "album") && (callbacks[i].id == result.album_id)) {
					callbacks[i].ratingConfirm.call(callbacks[i], result.album_rating);
				}
			}
			//log.log callbackcount
		}
		if (result.code == 1) help.continueTutorialIfRunning("ratecurrentsong");
	};
	
	that.songFavUpdate = function(result) {
		result['fav_type'] = "song";
		result['id'] = result['song_id'];
		that.favUpdate(result);
	};
	
	that.albumFavUpdate = function(result) {
		result['fav_type'] = "album";
		result['id'] = result['album_id'];
		that.favUpdate(result);
	};

	that.favUpdate = function(result) {
		if (result.id) {
			for (var i in callbacks) {
				if ((callbacks[i].category == result.fav_type) && (callbacks[i].id == result.id)) {
					callbacks[i].favConfirm.call(callbacks[i], result.favourite);
				}
			}
		}
		if (result.code == 1) help.continueTutorialIfRunning("setfavourite");
	};
	
	that.historyUpdate = function(result) {
		var maxhistidx = 0;
		if (result[0] && result[0].song_data && result[0].song_data[0]) {
			for (var i in callbacks) {
				if ((callbacks[i].category == "album") && (callbacks[i].id == result[0].song_data[0].album_id)) {
					callbacks[i].updateSiteRating.call(callbacks[i], result[0].song_data[0].album_rating_avg);
				}
				else if ((callbacks[i].category == "song") && (callbacks[i].id == result[0].song_data[0].song_id)) {	
					callbacks[i].updateSiteRating.call(callbacks[i], result[0].song_data[0].song_rating_avg);
				}
			}
		}
	};
	
	that.addCallback = function(ratingobj) {
		var cid = maxid;
		maxid++;
		callbacks[cid] = ratingobj;
		return cid;
	};
	
	that.eraseCallback = function(control_id) {
		delete(callbacks[control_id]);
	};
	
	that.p_hideuntilrated = function(hideuntilrated) {
		that.hideuntilrated = hideuntilrated;
	}
	
	prefs.addPref("rating", { name: "hidesite", callback: that.p_hideuntilrated, defaultvalue: false, type: "checkbox", refresh: true, dsection: "edi" });

	lyre.addCallback(that.ratingUpdate, "rate_result");
	lyre.addCallback(that.songFavUpdate, "fav_song_result");
	lyre.addCallback(that.albumFavUpdate, "fav_album_result");
	lyre.addCallback(that.historyUpdate, "sched_history");

	return that;
}();