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

	self.chain_transition = function(el, end_func) {
		var end_func_wrapper = function(e) {
			end_func(e, el);
			el.removeEventListener("transitionend", end_func_wrapper, false);
		};
		el.addEventListener("transitionend", end_func_wrapper, false);
	};

	self.remove_element = function(el) {
		if (document.body.classList.contains("loading")) {
			if (el.parentNode) el.parentNode.removeChild(el);
		}
		else {
			self.chain_transition(el,
				function() {
					if (el.parentNode) {
						el.parentNode.removeChild(el);
					}
				}
			);
			setTimeout(function() {
				el.style.opacity = 0;
			}, 1);
			// failsafe
			setTimeout(function() {
				if (el.parentNode) {
					el.parentNode.removeChild(el);
				}
			});
		}
	};

	return self;
}();
