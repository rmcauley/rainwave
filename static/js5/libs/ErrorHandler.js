(function() {
	"use strict";
	var self = {};
	var container;
	var permanent_errors = {};

	var onerror_handler = function(message, url, lineNo, charNo, exception) {
		// todo
	};

	self.initialize = function(template) {
		API.add_callback(self.permanent_error, "station_offline");
		API.add_universal_callback(self.tooltip_error);

		container = template.messages;
	};

	self.make_error = function(tl_key, code) {
		return { "tl_key": tl_key, "code": code, "text": $l(tl_key) };
	};

	self.permanent_error = function(json, append_element) {
		if (!(json.tl_key in permanent_errors)) {
			RWTemplates.error_permanent(json);
			json.$t.close_button.addEventListener("click", function() { self.remove_permanent_error(json.tl_key); });
			if (append_element) json.$t.el.appendChild(append_element);
			container.appendChild(json.$t.el);
			permanent_errors[json.tl_key] = json;
		}
	};

	self.remove_permanent_error = function(tl_key) {
		if (tl_key in permanent_errors) {
			Fx.remove_element(permanent_errors[tl_key].$t.el);
			delete(permanent_errors[tl_key]);
		}
	};

	self.tooltip_error = function(json) {
		RWTemplates.error_tooltip(json);
		document.body.appendChild(json.$t.el);
		Fx.delay_css_setting(json.$t.el, "opacity", 1);
		setTimeout(function() { Fx.remove_element(json.$t.el); }, 5000);
	};

	window.onerror = onerror_handler;
	window.ErrorHandler = self;

	return self;
})();