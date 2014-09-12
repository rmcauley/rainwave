var Mouse = function() {
	"use strict";
	var self = {};
	self.x = 0;
	self.y = 0;

	var update_mouse = function(e) {
		self.x = e.pageX ? e.pageX : e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
		self.y = e.pageY ? e.pageY : e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
	};

	self.get_y = function(e) {
		return e.pageY ? e.pageY : e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
	};

	self.is_mouse_leave = function(e, p_node) {
		var reltg = (e.relatedTarget) ? e.relatedTarget : e.toElement;
		while ((reltg != p_node) && (reltg.nodeName != 'BODY')) {
			reltg = reltg.parentNode;
		}
		if (reltg == p_node) return false;
		return true;
	}

	// ONLY ON DOWN, not on move!
	// This is mostly used to track where the mouse is to help tooltip error displays
	window.addEventListener('mousedown', update_mouse, true);

	return self;
}();