var Sizing = function() {
	"use strict";
	var self = {};
	self.sizeable_area = false;
	self.measure_area = false;
	var window_callbacks = [];
	var csschange_callbacks = [];
	var csschange_checks = [];
	var height, width, menu_height, sizeable_area_size;

	self.height = function() { return height; };
	self.width = function() { return width; };
	self.menu_height = function() { return menu_height; };
	self.sizeable_area_height = function() { return sizeable_area_size; };

	self.add_resize_callback = function(cb) {
		window_callbacks.push(cb);
	};

	self.add_check = function(t) {
		csschange_checks.push(t);
	};

	self.add_change_callback = function(cb) {
		csschange_callbacks.push(cb);
	};

	self.trigger_resize = function() {
		on_resize();
	};

	var on_resize = function() {
		height = document.documentElement.clientHeight;
		width = document.documentElement.clientWidth;
		menu_height = Menu.height();
		sizeable_area_size = height - self.sizeable_area.offsetTop;

		var i, k;
		for (i = 0; i < window_callbacks.length; i++) {
			window_callbacks[i]();
		}

		for (i = 0; i < csschange_checks.length; i++) {
			if (csschange_checks[i]()) {
				for (k = 0; k < csschange_callbacks(); k++) {
					csschange_callbacks[i]();
				}
				break;
			}
		}
	};

	window.addEventListener("resize", on_resize);

	return self;
};