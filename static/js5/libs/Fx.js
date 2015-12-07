var requestNextAnimationFrame = function() {
	"use strict";
	var queue = [];

	var go = function(t) {
		var this_queue = queue;
		queue = [];
		requested = false;
		for (var i = 0; i < this_queue.length; i++) {
			this_queue[i](t);
		}
	};

	var delay = function() {
		requestAnimationFrame(go);
	};

	var requested;
	return function(f) {
		queue.push(f);
		if (!requested) {
			requestAnimationFrame(delay);
		}
		requested = true;
	};
}();

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
			requestNextAnimationFrame(function() {
				el.style.opacity = 0;
			});
			// failsafe
			requestNextAnimationFrame(function() {
				if (el.parentNode) {
					el.parentNode.removeChild(el);
				}
			});
		}
	};

	return self;
}();
