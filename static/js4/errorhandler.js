var ErrorHandler = function() {
	"use strict";
	var self = {};
	var container;
	var permanent_errors = {};
	var number_of_debug_divs = -1;

	self.initialize = function() {
		API.add_callback(self.permanent_error, "station_offline");
		API.add_universal_callback(self.tooltip_error);

		container = $id("messages");
	};

	self.make_error = function(tl_key, code) {
		return { "tl_key": tl_key, "code": code, "text": $l(tl_key) };
	};

	self.permanent_error = function(json) {
		if (!(json.tl_key in permanent_errors)) {
			var err = json;
			err.el = $el("div", [ "X", json.text ]);
			err.el.children[0].addEventListener("click", function() { self.remove_permanent_error(err.tl_key); });
			permanent_errors[json.tl_key] = err;
		}
	};

	self.remove_permanent_error = function(tl_key) {
		if (tl_key in permanent_errors) {
			Fx.remove_element(permanent_errors[tl_key]);
			delete permanent_errors[tl_key];
		}
	};

	// TODO: update this to be an actual modal error
	self.modal_error = function(title, el) {
		API.sync_stop();
		container.appendChild($el("div", { "class": "error_modal" }, [ el ]));
	};

	self.tooltip_error = function(callback_name, json) {
		if (("success" in json) && (!json.success)) {
			var err = $el("div", { "class": "error_tooltip", "textContent": json.text });

			var x = Mouse.x;
			var y = Mouse.y;
			if (y < 30) y = 30;
			if (x > (window.innerWidth - err.offsetWidth)) x = window.innerWidth - err.offsetWidth - 15;
			if (y > (window.innerHeight - err.offsetHeight)) y = window.innerHeight - err.offsetHeight - 15;
			err.style.left = x + "px";
			err.style.top = y + "px";

			document.body.appendChild(err);
			setTimeout(function() { Fx.remove_element(err); }, 5000);
		}
	};

	self.javascript_error = function(err, json) {
		var error_el = $el("div", { "class": "error_javascript" }, [
			$el("strong", $l("submit_javascript_error")),
			$el("textarea", err.message + "\n" + err.name + "\n\n" + err.stack + "\n\nServer response:\n" + JSON.stringify(json) + "\n")
			]);
		self.modal_error(_l("javascript_error"), error_el);
	};

	self.make_debug_div = function() {
		number_of_debug_divs++;
		return document.getElementsByTagName("body")[0].appendChild($el("div", { "class": "debug_div", "style": "top: " + (50 + (number_of_debug_divs * 20)) + "px;" }));
	};

	return self;
}();
