'use strict';

var Mouse = function() {
	var self = {};
	self.x = 0;
	self.y = 0;

	// stolen from quirksmode.org
	var update_mouse_x = function(e) {
		var posx = 0;
		if (!e) e = window.event;
		if (e.pageX) {
			self.x = e.pageX;
		}
		else if (e.clientX) {
			self.x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
		}
	}

	// more stealing from quirksmode.org
	var update_mouse_y = function(e) {
		var posy = 0;
		if (!e) e = window.event;
		if (e.pageY) {
			self.y = e.pageY;
		}
		else if (e.clientY) {
			self.y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
		}
	}

	window.addEventListener('mousedown', update_mouse_x, true);
	window.addEventListener('mousedown', update_mouse_y, true);
}();
