var Mouse = function() {
	"use strict";
	var self = {};

	self.get_y = function(e) {
		return e.pageY ? e.pageY : e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
	};

	return self;
}();