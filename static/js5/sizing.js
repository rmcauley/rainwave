var Sizing = function() {
	"use strict";
	var self = {};
	var sizeable_area = null;
	var measure_area = null;
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
		sizeable_area_size = height - sizeable_area.offsetTop;
		sizeable_area.style.height = sizeable_area_size + "px";

		for (var i = 0; i < sizeable_area.childNodes.length; i++) {
			sizeable_area.childNodes[i].style.height = sizeable_area_size + "px";
		}

		for (i = 0; i < window_callbacks.length; i++) {
			window_callbacks[i]();
		}
	};

	self.add_to_measure = function(el) {
		if (el.parentNode != measure_area) {
			measure_area.appendChild(el);
		}
	};

	self.measure_el = function(el) {
		if (el.parentNode != measure_area) {
			measure_area.appendChild(el);
		}
		var x = el.offsetWidth;
		var y = el.scrollHeight || el.offsetHeight;
		return { "width": x, "height": y };
	};

	window.addEventListener("resize", on_resize);

	BOOTSTRAP.on_init.push(function(t) {
		measure_area = t.measure_box;
		sizeable_area = t.sizeable_area;
	});

	return self;
}();