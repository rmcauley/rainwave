var Sizing = function() {
	"use strict";
	var self = {};
	var sizeable_area = null;
	var measure_area = null;
	var window_callbacks = [];
	var height, width, sizeable_area_size;

	self.simple = false;

	self.height = function() { return height; };
	self.width = function() { return width; };
	self.sizeable_area_height = function() { return sizeable_area_size; };

	self.add_resize_callback = function(cb) {
		window_callbacks.push(cb);
	};

	self.trigger_resize = function() {
		height = document.documentElement.clientHeight;
		width = document.documentElement.clientWidth;
		sizeable_area_size = height - sizeable_area.offsetTop;
		sizeable_area.style.height = sizeable_area_size + "px";

		for (var i = 0; i < sizeable_area.childNodes.length; i++) {
			sizeable_area.childNodes[i].style.height = sizeable_area_size + "px";
		}

		if (width < 1050) {
			document.body.classList.add("simple");
			document.body.classList.remove("full");
			self.simple = true;
		}
		else {
			if (Prefs.get("adv")) {
				document.body.classList.remove("simple");
				document.body.classList.add("simple");
				self.simple = false;
			}
			else {
				document.body.classList.add("simple");
				document.body.classList.remove("full");
				self.simple = true;
			}
		}
		if (width < 1366) {
			document.body.classList.add("small");
		}
		else {
			document.body.classList.remove("small");
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

	window.addEventListener("resize", self.trigger_resize);

	BOOTSTRAP.on_init.push(function(t) {
		measure_area = t.measure_box;
		sizeable_area = t.sizeable_area;
	});

	return self;
}();