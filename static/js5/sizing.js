var Sizing = function() {
	"use strict";
	var self = {};
	self.sizeable_area = null;
	self.measure_area = document.createElement("div");
	self.measure_area.className = "measure_box";
	var window_callbacks = [];
	var height, width, sizeable_area_size;

	self.height = function() { return height; };
	self.width = function() { return width; };
	self.sizeable_area_height = function() { return sizeable_area_size; };

	self.add_resize_callback = function(cb) {
		window_callbacks.push(cb);
	};

	self.trigger_resize = function() {
		on_resize();
	};

	var on_resize = function() {
		height = document.documentElement.clientHeight;
		width = document.documentElement.clientWidth;
		sizeable_area_size = height - self.sizeable_area.offsetTop;
		self.sizeable_area.style.height = sizeable_area_size + "px";

		for (var i = 0; i < window_callbacks.length; i++) {
			window_callbacks[i]();
		}
	};

	window.addEventListener("resize", on_resize);

	return self;
};