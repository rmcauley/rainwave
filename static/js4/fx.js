'use strict';

var Fx = function() {
	var self = {};

	//var transforms = [ "transform", "WebkitTransform", "msTransform", "MozTransform", "OTransform" ];
	//var p;
	//while (p = transforms.shift()) {
	//	if (typeof el.style[p] != 'undefined') {
	//		return p;
	//	}
	//}

	var animation_ends = [ "animationend", "webkitAnimationEnd", "oanimationend", "MSAnimationEnd" ]
	self.remove_on_animation_end = function(el) {
		var end_func = function() {
			el.parentNode.removeChild(el);
		};
		for (animation_end in animation_ends) {
			el.addEventListener(animation_end, end_func, false);
		}
	};
}();
