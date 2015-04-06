var Prefs = function() {
	"use strict";
	var self = {};
	var meta = {};
	var callbacks = {};
	var values;
	try {
		values = JSON.parse(docCookies.getItem("r5_prefs")) || {};
	}
	catch(err) {
		values = {};
	}

	self.save = function() {
		docCookies.setItem("r5_prefs", JSON.stringify(values), Infinity, "/", BOOTSTRAP.cookie_domain);
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
		var old_value = values[name];
		values[name] = value;
		if (!skip_callbacks) {
			for (var i in callbacks[name]) {
				callbacks[name][i](value, old_value);
			}
		}
		// do this AFTER callbacks in case a callback triggers a JS error
		self.save("r4_prefs");
		return true;
	};

	self.define = function(name, legal_values) {
		if (meta[name]) return;
		meta[name] = {};
		meta[name].legal_values = legal_values || [ false, true ];
		if (!(name in values)) {
			values[name] = legal_values ? legal_values[0] : false;
		}
		if (!callbacks[name]) callbacks[name] = [];
	};

	self.add_callback = function(name, method) {
		if (!callbacks[name]) callbacks[name] = [];
		callbacks[name].push(method);
	};

	return self;
}();
