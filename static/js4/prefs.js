var Prefs = function() {
	"use strict";
	var meta = {};
	var values = {};
	var self = {};
	var callbacks = {};
	var cookie_domain = BOOTSTRAP.cookie_domain;

	// the following preferences are for speed-critical functions
	self.playlist_sort_faves_first = false;
	self.playlist_sort_available_first = true;

	// a small set of characters need to be escaped, not all, and not all of these are caught by escape() and escape() bloats the JSON object to 2x the size
	// a better idea is to use encodeURIComponent, but again, we get 2x the cookie size as a result.
	// unfortunately, for Opera users, we have to use encodeURIComponent because Opera silently fails to save the cookie due to apparently some illegal chars.
	var heavyencode = false;
	if (navigator.userAgent.toLowerCase().indexOf("opera") > 0) heavyencode = true;

	self.save = function(name, object) {
		var today = new Date();
		var expiry = new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000 * 13);
		var sfied = JSON.stringify(values);
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
		document.cookie = thecookie + ";path=/;domain=" + cookie_domain + ";expires=" + expiry.toGMTString();
	};

	self.load = function(name) {
		var dc = document.cookie;
		var cname = name + "=";
		var begin = dc.indexOf("; " + cname);
		if (begin == -1) {
			begin = dc.indexOf(cname);
			if (begin !== 0) return null;
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
		try {
			values = JSON.parse(mmm_cookie);
		}
		catch (err) {
			// silently fail, resetting all preferences to their defaults
			values = {};
		}
		return true;
	};

	self.get = function(name) {
		if (!(name in values)) {
			if (name in meta) {
				return meta[name].legal_values[0];
			}
			return false;
		}
		return values[name];
	};

	self.change = function(name, value, skip_callbacks) {
		if (!(name in meta)) {
			return false;
		}
		if (value === self.get(name)) return;
		if (meta[name].verify_function) {
			if (!meta[name].verify_functon(value)) {
				return false;
			}
		}
		if (meta[name].legal_values) {
			var valid = false;
			for (var i in meta[name].legal_values) {
				if (value === meta[name].legal_values[name][i]) {
					valid = true;
				}
			}
			if (!valid) {
				return false;
			}
		}
		values[name] = value;
		if (!skip_callbacks) {
			do_callbacks(name, value);
		}
		// do this AFTER callbacks in case a callback triggers a JS error
		self.save();
		if (meta[name].reload_trigger) {
			window.location.reload();
		}
		return true;
	};

	// always false by default: enforce consistency!
	self.define_boolean = function(name) {
		self.define(name, [ false, true ]);
	};

	self.define = function(name, legal_values, verify_function) {
		if (meta[name]) return;
		meta[name] = {};
		meta[name].legal_values = legal_values;
		meta[name].verify_function = verify_function ? verify_function : null;
		if (!(name in values)) {
			values[name] = legal_values ? legal_values[0] : false;
		}
		callbacks[name] = [];
	};

	self.add_callback = function(name, method) {
		callbacks[name].push(method);
	};

	var do_callbacks = function(name, value) {
		for (var i in callbacks[name]) {
			callbacks[name][i](value);
		}
	};

	// One of the few times we don't have an initialize() in R4
	// prefs should be loaded before anything else
	self.load();

	return self;
}();
