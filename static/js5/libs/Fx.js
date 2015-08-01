var Fx = function() {
	"use strict";
	var self = {};

	self.transform = function() {
		var transforms = [ "transform", "WebkitTransform", "msTransform", "MozTransform" ];
		var p = transforms.shift();
		var t = document.createElement("div");
		while (p) {
			if (typeof(t).style[p] !== "undefined") {
				return p;
			}
			p = transforms.shift();
		}
	}();

	var transition_ends = [ "transitionend", "webkitTransitionEnd" ];
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
