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
		$id("measure_box").appendChild($el("img", { "src": "/static/images4/cancel.png", "alt": "X", "width": "14", "height": "14" }));
	};

	self.make_error = function(tl_key, code) {
		return { "tl_key": tl_key, "code": code, "text": $l(tl_key) };
	};

	self.permanent_error = function(json, append_element) {
		if (!(json.tl_key in permanent_errors)) {
			var err = json;
			err.el = $el("div", { "class": "error" });
			err.hide = err.el.appendChild($el("img", { "src": "/static/images4/cancel.png", "alt": "X", "width": "14", "height": "14" }));
			err.hide.addEventListener("click", function() { self.remove_permanent_error(err.tl_key); });
			err.el.appendChild($el("span", { "textContent": err.text + " " }));
			if (append_element) err.el.appendChild(append_element);
			container.appendChild(err.el);
			permanent_errors[json.tl_key] = err;
		}
	};

	self.remove_permanent_error = function(tl_key) {
		if (tl_key in permanent_errors) {
			Fx.remove_element(permanent_errors[tl_key].el);
			delete permanent_errors[tl_key];
		}
	};

	self.modal_error = function(el) {
		API.sync_stop();
		if ($id("modal_background")) return;
		document.body.insertBefore($el("div", { "id": "modal_background" }), document.body.firstChild);
		document.body.insertBefore(el, document.body.firstChild);
	};

	self.tooltip_error = function(callback_name, json) {
		if (!json) return;
		if (("success" in json) && (!json.success)) {
			var err = $el("div", { "class": "error_tooltip", "textContent": json.text });

			var m = $measure_el(err);
			var x = Mouse.x - 5;
			var y = Mouse.y - m.height - 2;
			if (y < 30) y = 30;
			if (x > (window.innerWidth - m.width)) x = window.innerWidth - err.offsetWidth - 15;
			if (y > (window.innerHeight - m.height)) y = window.innerHeight - err.offsetHeight - 15;
			err.style.left = x + "px";
			err.style.top = y + "px";

			document.body.appendChild(err);
			Fx.delay_css_setting(err, "opacity", 1);
			setTimeout(function() { Fx.remove_element(err); }, 5000);
		}
	};

	self.javascript_error = function(err, json) {
		var error_el = $el("div", { "id": "error_javascript" }, [
			$el("h4", { "textContent": $l("catastrophic_error") }),
			$el("a", { "href": "http://rainwave.cc/forums/viewforum.php?f=27", "textContent": $l("submit_javascript_error") }),
			$el("textarea", { "textContent": err.message + "\n" + err.name + "\n\n" + err.stack + "\n\nServer response:\n" + JSON.stringify(json) + "\n" })
		]);
		self.modal_error(error_el);
	};

	self.make_debug_div = function() {
		number_of_debug_divs++;
		return document.getElementsByTagName("body")[0].appendChild($el("div", { "class": "debug_div", "style": "top: " + (50 + (number_of_debug_divs * 20)) + "px;" }));
	};

	return self;
}();
