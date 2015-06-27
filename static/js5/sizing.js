var Sizing = function() {
	"use strict";
	var self = {};
	var sizeable_area = null;
	var measure_area = null;
	var window_callbacks = [];
	var height, width, sizeable_area_size;
	var index_t;

	self.simple = false;
	self.small = false;
	self.song_size_np = 0;
	self.song_size = 0;
	self.timeline_header_size = 0;

	self.height = function() { return height; };
	self.width = function() { return width; };
	self.sizeable_area_height = function() { return sizeable_area_size; };

	self.add_resize_callback = function(cb) {
		window_callbacks.push(cb);
	};

	self.trigger_resize = function() {
		height = document.documentElement.clientHeight;
		width = document.documentElement.clientWidth;
		var right_of_timeline;
		if (index_t.timeline.parentNode == sizeable_area) {
			right_of_timeline = index_t.timeline.offsetLeft + index_t.timeline.offsetWidth;
		}
		else {
			right_of_timeline = index_t.timeline.parentNode.offsetLeft + index_t.timeline.parentNode.offsetWidth;
		}
		sizeable_area_size = height - sizeable_area.offsetTop;
		sizeable_area.style.height = sizeable_area_size + "px";

		for (var i = 0; i < sizeable_area.childNodes.length; i++) {
			sizeable_area.childNodes[i].style.height = sizeable_area_size + "px";
		}

		if (width < 1050) {
			document.body.classList.add("simple");
			document.body.classList.add("simple_f");
			document.body.classList.remove("full");
			document.body.classList.remove("mobile");
			self.simple = true;
			index_t.lists.style.left = "100%";
			index_t.detail.style.left = "100%";

			if (width < 600) {
				document.body.classList.add("mobile");
			}
		}
		else {
			document.body.classList.remove("simple_f");
			document.body.classList.remove("mobile");
			if (Prefs.get("adv")) {
				document.body.classList.remove("simple");
				document.body.classList.add("full");
				self.simple = false;
				index_t.lists.style.left = null;
				index_t.detail.style.left = null;
			}
			else {
				document.body.classList.add("simple");
				document.body.classList.remove("full");
				self.simple = true;
				index_t.lists.style.left = right_of_timeline + "px";
				index_t.detail.style.left = right_of_timeline + "px";
			}

			if (width < 1366) {
				document.body.classList.add("small");
				document.body.classList.remove("normal");
			}
			else {
				document.body.classList.remove("small");
				document.body.classList.add("normal");
			}
		}

		self.song_size_np = self.simple ? 140 : 100;
		self.song_size = self.simple ? 100 : 70;
		self.timeline_header_size = self.simple ? 30 : 20;

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
		index_t = t;
	});

	return self;
}();