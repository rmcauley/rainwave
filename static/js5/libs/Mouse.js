var Mouse = function() {
	"use strict";
	var self = {};

	self.get_y = function(e) {
		return e.pageY ? e.pageY : e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
	};

	if (!MOBILE) {
		self.x = 0;
		self.y = 0;

		var update_mouse = function(e) {
			self.x = e.pageX ? e.pageX : e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
			self.y = e.pageY ? e.pageY : e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
		};

		// ONLY ON DOWN, not on move!
		// This is mostly used to track where the mouse is to help tooltip error displays
		window.addEventListener("mousedown", update_mouse, true);
	}


	return self;
}();