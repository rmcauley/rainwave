var Prefs = function() {
	"use strict";
	var meta = {};
	var values = {};
	var self = {};
	var callbacks = {};

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
		docCookies.setItem(name, sfied, Infinity, "/", BOOTSTRAP.cookie_domain);
	};

	self.load = function(name) {
		var mmm_cookie = docCookies.getItem(name);
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
