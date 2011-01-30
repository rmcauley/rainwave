function RatingUpdateControl() {
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
	
	//user.addCallback(that, that.loginUpdate, "tunedin");
	ajax.addCallback(that, that.ratingUpdate, "rate_result");
	ajax.addCallback(that, that.songFavUpdate, "fav_song_result");
	ajax.addCallback(that, that.albumFavUpdate, "fav_album_result");
	ajax.addCallback(that, that.historyUpdate, "sched_history");

	return that;
};

function Rating(p) {
	var that = {};

	if ((p.category != "song") && (p.category != "album")) return undefined;
	that.category = p.category;
	if (isNaN(p.id)) return undefined;
	that.id = p.id;
	if ((p.userrating >= 1) && (p.userrating <= 5)) that.userrating = p.userrating;
	else that.userrating = 0;
	if ((p.siterating >= 1) && (p.siterating <= 5)) that.siterating = p.siterating;
	else that.siterating = 0;
	if (p.favourite) that.favourite = true;
	else that.favourite = false;
	if (p.ratable) that.ratable = true;
	else that.ratable = false;
	if (p.register) that.register = true;
	else that.register = false;
	if (p.fake) that.fake = p.fake;
	else that.fake = false;
	
	if (that.register) that.control_id = ratingcontrol.addCallback(that)
	else that.control_id = false;
	that.oldrating = that.userrating;

	var lasttime = 0;
	var lockeduntil = 0;
	
	that.el = false;
	that.mousecatch = false;
	that.favhover = false;

	var sitetext = "";

	theme.Extend.Rating(that);
	
	that.destruct = function() {
		if (that.control_id >= 0) ratingcontrol.eraseCallback(that.control_id);
	};
	
	that.enable = function() {
		if (that.category == "song") that.ratable = true;
	};
	
	that.disable = function() {
		that.ratable = false;
		that.resetUser();
	};
	
	that.onMouseMove = function(evt) {
		var r = that.userCoord(evt);
		if (that.ratable && r) {
			that.setUser(that.scrubRating(r));
		}
		else if (that.ratable && !r) {
			that.resetUser();
		}
	};
	
	that.onMouseOut = function(evt) {
		that.resetUser();
		that.favMouseOut();
	};
	
	that.onClick = function(evt) {
		if (that.favhover) {
			that.favClick();
		}
		else if (that.ratable) {
			var now = clock.time();
			var newrating = 0;
			if (now > lockeduntil) {
				if ((lasttime + 5) >= now) {
					lockeduntil = now + 5;
				}
				lasttime = now;
				newrating = that.scrubRating(that.userCoord(evt));
				that.oldrating = that.userrating;
				that.userrating = newrating;
				that.setUser(newrating);
				if (that.fake) {
					that.ratingConfirm(newrating);
				}
				else {
					ajax.async_get("rate", { "rating": newrating, "song_id": that.id });
				}
				//that.showConfirmClick();
			}
			//TODO: else { alert user }
		}
	};
	
	that.ratingConfirm = function(rating) {
		that.userrating = rating;
		that.resetUser();
		that.showConfirmOK();
		setTimeout(that.resetConfirm, 750);
		that.updateSiteRating(that.siterating);
	};

	that.ratingBad = function(rating) {
		that.userrating = that.oldrating;
		that.resetUser();
		that.showConfirmBad();
		that.setTimeout(that.resetConfirm, 750);
	};
	
	that.updateSiteRating = function(site) {
		that.siterating = site;
		if (ratingcontrol.hideuntilrated && !that.userrating) {
			that.setSite(0);
			return;
		}
		that.setSite(site);
	};
	
	that.scrubRating = function(rating) {
		if (rating < 1) rating = 1;
		else if (rating > 5) rating = 5;
		return Math.round(rating * 2) / 2;
	};
	
	that.favConfirm = function(state) {
		that.favourite = state;
		that.favChange(state);
	};
	
	that.favMouseOver = function(evt) {
		if (user.p.user_id <= 1) return;
		that.favhover = true;
		that.favChange(2);
	};
	
	that.favMouseOut = function(evt) {
		if (user.p.user_id <= 1) return;
		that.favhover = false;
		that.favChange(that.favourite);
	};
	
	that.favClick = function(evt) {
		if (that.fake) {
			that.favConfirm(that.favourite ? false : true);
			return;
		}
		if (user.p.user_id <= 1) return;
		var setfav = that.favourite ? "false" : "true";
		var category_id = that.category + "_id";
		var submithash = {};
		submithash['fav'] = setfav;
		submithash[that.category + "_id"] = that.id;
		ajax.async_get("fav_" + that.category, submithash);
	};
	
	that.draw();
	
	that.setUser(that.userrating);
	that.updateSiteRating(that.siterating);
	if (that.favourite) that.favChange(that.favourite);
	
	if (that.mousecatch) {
		that.mousecatch.addEventListener("mousemove", that.onMouseMove, true);
		that.mousecatch.addEventListener("mouseout", that.onMouseOut, true);
		that.mousecatch.addEventListener("click", that.onClick, true);
	}

	// if (that.favcatch) {
		// that.favcatch.addEventListener("mouseover", that.favMouseOver, true);
		// that.favcatch.addEventListener("mouseout", that.favMouseOut, true);
		// that.favcatch.addEventListener("click", that.favClick, true);
	// }	
	if (that.ratable) that.enable();

	return that;
}
