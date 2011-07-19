var ticker = function() {
	var that = {};
	that.el = false;
	
	theme.Extend.Ticker(that);
	
	var items = [];
	
	that.addTickerItem = function(text, url, x_api_action, x_api_params, override) {
		if (!url) url = false;
		if (!x_api_action) x_api_action = false;
		if (!x_api_params) x_api_params = false;
		var item = { "text": text, "url": url, "x_api_action": x_api_action, "x_api_params": x_api_params };
		item.code = parseInt(clock.now + "");
		if (override) {
			items.unshift(item);
			items.unshift(false);	// give a dummy item for nextItem to eat
			that.nextItem();
		}
		else {
			items.push(item);
			if (items.length == 1) that.showItem(items[0]);
		}
		return item.code;
	};
	
	that.nextItem = function() {
		that.hideItem();
		items.splice(0, 1);
		if (items.length > 0) that.showItem(items[0]);
	};
	
	that.removeItem = function(code) {
		if (items[0].code === code) {
			that.nextItem();
			return;
		}
		
		for (var i = 0; i < items.length; i++) {
			if (items[i].code === code) {
				items.splice(i, 1);
				return;
			}
		}
	};
	
	var statrestrict_override = false;
	that.statRestrict = function(restricted) {
		if (restricted) {
			statrestrict_override = ticker.addTickerItem(_l("log_3", { "lockedto": SHORTSTATIONS[user.p.radio_active_sid], "currentlyon": SHORTSTATIONS[user.p.sid] }), false, false, false, true);
		}
		else {
			ticker.removeItem(statrestrict_override);
			statrestrict_override = false;
		}
	};
	
	that.newsHandle = function(json) {
		for (var i = 0; i < json.length; i++) {
			that.addTickerItem(json[i].news_headline, json[i].news_url);
		}
	};
	
	lyre.addCallback(that.newsHandle, "news");
	user.addCallback(that.statRestrict, "radio_statrestricted");
	
	return that;
}();