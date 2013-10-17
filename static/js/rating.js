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

	that.oldrating = that.userrating;

	var lasttime = 0;
	var lockeduntil = 0;

	that.el = false;
	that.mousecatch = false;
	that.favhover = false;

	var sitetext = "";

	theme.Extend.Rating(that);

	that.enable = function() {
		if (that.category == "song") that.ratable = true;
	};

	that.disable = function() {
		if (!user.p.radio_rate_anything) {
			that.ratable = false;
			that.resetUser();
		}
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
			var now = clock.now;
			var newrating = 0;
			if (now > lockeduntil) {
				if ((lasttime + 5) >= now) {
					lockeduntil = now + 5;
				}
				lasttime = now;
				var newrating = that.userCoord(evt)
				if (newrating == 0) return;
				newrating = that.scrubRating(newrating);
				that.oldrating = that.userrating;
				that.userrating = newrating;
				that.setUser(newrating);
				if (that.fake) {
					that.ratingConfirm(newrating);
				}
				else {
					lyre.async_get("rate", { "rating": newrating, "song_id": that.id });
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
		setTimeout(that.resetConfirm, 750);
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
		submithash['fave'] = setfav;
		submithash[that.category + "_id"] = that.id;
		lyre.async_get("fave_" + that.category, submithash);
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

	if (that.register) ratingcontrol.addCallback(that)

	return that;
};
