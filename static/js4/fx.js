var Fx = function() {
	"use strict";
	var self = {};
	self.transform_string = "transform";
	self.delay_legacy_fx = false;
	var delayed_css = [];
	var delayed_fx = [];
	var draw_batch = [];

	var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame;
	var performance = window.performance || { "now": function() { return new Date().getTime(); } };
	if (!requestAnimationFrame) {
		requestAnimationFrame = function(callback) { window.setTimeout(callback, 40); };
	}

	// Fx throws a fit without this wrapper
	self.requestAnimationFrame = function(func) {
		requestAnimationFrame(func);
	};

	//*****************************************************************************
	//
	//  CSS3 Animation Support
	//
	//*****************************************************************************

	self.transform_string = function() {
		var transforms = [ "transform", "WebkitTransform", "msTransform", "MozTransform", "OTransform" ];
		var div = document.createElement("div");
		var p;
		while (p = transforms.shift()) {
			if (typeof(div.style[p]) != 'undefined') {
				return p;
			}
		}
	}();

	var do_delayed_css = function() {
		for (var i = 0; i < delayed_css.length; i++) {
			delayed_css[i].el.style[delayed_css[i].attribute] = delayed_css[i].value;
		}
		delayed_css = [];
	};

	var do_delayed_fx = function() {
		self.delay_legacy_fx = false;
		for (var i = 0; i < delayed_fx.length; i++) {
			delayed_fx[i]();
		}
		delayed_fx = [];
	}

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
		var end_func_wrapper = function() {
			end_func();
			for (var i in transition_ends) {
				el.removeEventListener(transition_ends[i], end_func_wrapper, false);
			}
		}
		for (var i in transition_ends) {
			el.addEventListener(transition_ends[i], end_func_wrapper, false);
		}
		el._end_func_wrapper = end_func_wrapper;
	}

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
	}

	self.remove_element = function(el) {
		var check = getComputedStyle(el);
		if (!check.getPropertyValue("transition-property") || (check.getPropertyValue("transition-property").indexOf("opacity") == -1)) {
			el.style.transition = "1s opacity";
		}
		self.chain_transition_css(el, "opacity", 0,
			function() {
				if (el.parentNode) el.parentNode.removeChild(el);
			}
		);
	};

	//*****************************************************************************
	//
	//  Draw Batching
	//
	//*****************************************************************************

	self.delay_draw = function(f) {
		draw_batch.push(f);
	};

	self.flush_draws = function(f) {
		for (var i = 0; i < draw_batch.length; i++) {
			draw_batch[i]();
		}
		draw_batch = [];
	};

	return self;
}();
