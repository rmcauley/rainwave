var Mouse = function() {
	"use strict";
	var self = {};
	self.x = 0;
	self.y = 0;

	// stolen from quirksmode.org
	// though, this level of compatibility may not be required anymore
	var update_mouse = function(e) {
		if (!e) e = window.event;
		if (e.pageX) {
			self.x = e.pageX;
		}
		else if (e.clientX) {
			self.x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
		}

		if (e.pageY) {
			self.y = e.pageY;
		}
		else if (e.clientY) {
			self.y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
		}
	};

	// ONLY ON CLICK, not on move!
	// This is mostly used to track where the mouse is to help tooltip error displays
	window.addEventListener('mousedown', update_mouse, true);

	return self;
}();
