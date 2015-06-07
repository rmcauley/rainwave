var Fx = function() {
	"use strict";
	var self = {};
	var delayed_css = [];

	//*****************************************************************************
	//
	//  CSS3 Animation Support
	//
	//*****************************************************************************

	self.transform = function() {
		var transforms = [ "transform", "WebkitTransform", "msTransform", "MozTransform", "OTransform" ];
		var p = transforms.shift();
		var t = document.createElement("div");
		while (p) {
			if (typeof(t).style[p] !== "undefined") {
				return p;
			}
			p = transforms.shift();
		}
	}();

	var do_delayed_css = function() {
		for (var i = 0; i < delayed_css.length; i++) {
			delayed_css[i].el.style[delayed_css[i].attribute] = delayed_css[i].value;
		}
		delayed_css = [];
	};

	self.delay_css_setting = function(el, attribute, value) {
		if (attribute == "transform") {
			attribute = self.transform_string;
		}
		delayed_css.push({ "el": el, "attribute": attribute, "value": value });
		if (delayed_css.length == 1) {
			setTimeout(function() { requestAnimationFrame(do_delayed_css); }, 1);
		}
	};

	var transition_ends = [ "transitionend", "webkitTransitionEnd", "otransitionend" ];
	self.chain_transition = function(el, end_func) {
		var end_func_wrapper = function(e) {
			end_func(e, el);
			for (var i in transition_ends) {
				el.removeEventListener(transition_ends[i], end_func_wrapper, false);
			}
		};
		for (var i in transition_ends) {
			el.addEventListener(transition_ends[i], end_func_wrapper, false);
		}
		el._end_func_wrapper = end_func_wrapper;
	};

	// limitation: can only chain once
	self.chain_transition_css = function(el, property, value, end_func) {
		self.chain_transition(el, end_func);
		self.delay_css_setting(el, property, value);
	};

	self.stop_chain = function(el) {
		if (("_end_func_wrapper" in el) && (el._end_func_wrapper)) {
			for (var i in transition_ends) {
				el.removeEventListener(transition_ends[i], el._end_func_wrapper, false);
			}
			el._end_func_wrapper = null;
		}
	};

	self.remove_element = function(el) {
		if (document.body.classList.contains("loading")) {
			if (el.parentNode) el.parentNode.removeChild(el);
		}
		else {
			self.chain_transition_css(el, "opacity", 0,
				function() {
					if (el.parentNode) el.parentNode.removeChild(el);
				}
			);
		}
	};

	return self;
}();
