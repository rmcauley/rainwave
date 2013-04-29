var prefs = function() {
	var newsectioncb = [];
	var newprefcb = [];
	var that = {};
	that.p = {};

	// a small set of characters need to be escaped, not all, and not all of these are caught by escape() and escape() bloats the JSON object to 2x the size
	// a better idea is to use encodeURIComponent, but again, we get 2x the cookie size as a result.
	// unfortunately, for Opera users, we have to use encodeURIComponent because Opera silently fails to save the cookie due to apparently some illegal chars.
	var heavyencode = false;
	if (navigator.userAgent.toLowerCase().indexOf("opera") > 0) heavyencode = true;
	
	that.saveCookie = function(name, object) {
		var today = new Date();
		var expiry = new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000 * 13);
		var sfied = JSON.stringify(object);
		if (heavyencode) {
			sfied = encodeURIComponent(sfied);
		}
		else {
			sfied = sfied.replace("%", "%25");
			sfied = sfied.replace("+", "%2B");
			sfied = sfied.replace("=", "%3D");
			sfied = sfied.replace(";", "%3B");
			sfied = sfied.replace(",", "%2C");
		}
		var thecookie = name + "=" + sfied;
		document.cookie = thecookie + ";path=/;domain=" + COOKIE_DOMAIN + ";expires=" + expiry.toGMTString();
	};

	that.loadCookie = function(name) {
		var dc = document.cookie;
		var cname = name + "=";
		var begin = dc.indexOf("; " + cname);
		if (begin == -1) {
			begin = dc.indexOf(cname);
			if (begin != 0) return null;
		} 
		else {
			begin += 2;
		}
		var end = document.cookie.indexOf(";", begin);
		if (end == -1) {
			end = dc.length;
		}
		var mmm_cookie = dc.substring(begin, end);
		if (!mmm_cookie) return null;
		mmm_cookie = mmm_cookie.substring(mmm_cookie.indexOf("=") + 1);
		if (heavyencode) {
			mmm_cookie = decodeURIComponent(mmm_cookie);
		}
		else {
			mmm_cookie = mmm_cookie.replace("%3B", ";");
			mmm_cookie = mmm_cookie.replace("%3D", "=");
			mmm_cookie = mmm_cookie.replace("%2B", "+");
			mmm_cookie = mmm_cookie.replace("%25", "%");
			mmm_cookie = mmm_cookie.replace("%2C", ",");
		}
		var cookieobj = null;
		try {
			cookieobj = JSON.parse(mmm_cookie);
		}
		catch (err) {
			// silently fail...
		}
		return cookieobj;
	};
	
	that.loadPrefs = function() {
		var loadedprefs = that.loadCookie("r3prefs");
		if (!loadedprefs) that.p = {};
		else if (loadedprefs.edi && loadedprefs.edi.wipeall && loadedprefs.edi.wipeall.value) that.p = {};
		else that.p = loadedprefs;
	};
	
	that.savePrefs = function() {
		var p = {};
		for (var section in that.p) {
			p[section] = {};
			for (var name in that.p[section]) {
				if (!that.p[section][name].sessiononly) {
					p[section][name] = { "value": that.p[section][name].value };
				}
			}
		}
		that.saveCookie("r3prefs", p);
	};
	
	that.getPref = function(section, name) {
		if (!that.p) return;
		if (!that.p[section]) return;
		if (!that.p[section][name]) return;
		return that.p[section][name].value;
	}
	
	that.changePref = function(section, name, value, nocallbacks) {
		if (!that.p[section]) return false;
		if (!that.p[section][name]) return false;
		if (typeof(that.p[section][name].verify) == "function") {
			if (!that.p[section][name].verify(value)) return false;
		}
		that.p[section][name].value = value;
		if (!nocallbacks) that.doCallback(that.p[section][name]);
		that.savePrefs();
		if (that.p[section][name].refresh || that.p[section][name].reload) {
			window.location.reload();
		}
		return true;
	};
	
	that.addPref = function(section, prefdata) {
		prefdata.callbacks = [];
		if (prefdata.callback) {
			if (prefdata.callbackobj) {
				prefdata.callbacks.push({"object": prefdata.callbackobj, "method": prefdata.callback});
				delete(prefdata.callbackobj);
			}
			else if (prefdata.callback) {
				prefdata.callbacks.push({"method": prefdata.callback});
				delete(prefdata.callback);
			}			
		}
		if (!that.p[section]) that.newSection(section);
		if (!that.p[section][prefdata.name]) {
			prefdata.value = prefdata.defaultvalue;
			that.p[section][prefdata.name] = prefdata;
		}
		else {
			prefdata.value = that.p[section][prefdata.name].value;
			that.p[section][prefdata.name] = prefdata;
		}
		for (var i = 0; i < newprefcb.length; i++) {
			newprefcb[i].method.call(newprefcb[i].object, section, prefdata);
		}
		that.doCallback(prefdata);
	};
	
	that.newSection = function(section) {
		that.p[section] = {};
		for (var i = 0; i < newsectioncb.length; i++) {
			newsectioncb[i].method.call(newsectioncb[i].object, section);
		}
	};
	
	that.addNewSectionCallback = function(object, method) {
		newsectioncb.push({"object": object, "method": method});
	};
	
	that.addNewPrefCallback = function(object, method) {
		newprefcb.push({"object": object, "method": method});
	};
	
	that.addPrefCallback = function(section, name, method, object) {
		if (object) that.p[section][name].callbacks.push({"object": object, "method": method});
		else that.p[section][name].callbacks.push({"method": method});
	};
	
	that.doCallback = function(pref) {
		if (!pref.callbacks) return;
		for (var i = 0; i < pref.callbacks.length; i++) {
			if (typeof(pref.callbacks[i].object) == "object") {
				pref.callbacks[i].method.call(pref.callbacks[i].object, pref.value);
			}
			else if (typeof(pref.callbacks[i].method) == "function") {
				pref.callbacks[i].method(pref.value);
			}
		}
	};
	
	that.loadPrefs();	
	return that;
}();