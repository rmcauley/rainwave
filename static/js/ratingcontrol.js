var ratingcontrol = function() {
	var callbacks = {};
	var maxid = 0;
	
	var that = {};
	that.hideuntilrated = false;

	that.loginUpdate = function(result) {
		log.log("RatingControl", 0, "Count: " + callbacks.length);
	};
	
	that.ratingUpdate = function(result) {
		if (result.song_id) {
			for (var i in callbacks) {
				if ((callbacks[i].category == "song") && (callbacks[i].id == result.song_id)) {
					if (result.code == 1) callbacks[i].ratingConfirm(result.user_rating);
					else callbacks[i].ratingBad(result.user_rating);
				}
			}
			if ((result.code == 1) && result.updated_album_ratings) {
				for (var h in result.updated_album_ratings) {
					for (var i in callbacks) {
						if ((callbacks[i].category == "album") && (callbacks[i].id == result.updated_album_ratings[h].id)) {
							callbacks[i].ratingConfirm(result.updated_album_ratings[h].user_rating);
						}
					}
				}
			}
		}
		if (result.code == 1) help.continueTutorialIfRunning("ratecurrentsong");
	};
	
	that.cleanCallbacks = function() {
		// var idstart = new Date().getTime();
		var cb = 0;
		for (var i in callbacks) {
			if (!document.getElementById(callbacks[i].el.id)) {
				delete(callbacks[i]);
			}
			else {
				cb++;
			}
		}
		// var idend = new Date().getTime();
		
		//console.log("Ratings being tracked: " + cb + "/" + maxid);
		// console.log("ById speed: " + (idend - idstart));
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
					callbacks[i].favConfirm.call(callbacks[i], result.fave);
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
		maxid++;
		ratingobj.el.setAttribute("id", "rating_" + maxid);
		callbacks[maxid] = ratingobj;
	};
	
	that.p_hideuntilrated = function(hideuntilrated) {
		that.hideuntilrated = hideuntilrated;
	}
	
	prefs.addPref("rating", { name: "hidesite", callback: that.p_hideuntilrated, defaultvalue: false, type: "checkbox", refresh: true, dsection: "edi" });

	lyre.addCallback(that.ratingUpdate, "rate_result");
	lyre.addCallback(that.songFavUpdate, "fave_song_result");
	lyre.addCallback(that.albumFavUpdate, "fave_album_result");
	lyre.addCallback(that.historyUpdate, "sched_history");
	lyre.addCallback(that.cleanCallbacks, "sched_sync");

	return that;
}();
