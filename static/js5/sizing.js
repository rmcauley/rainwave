var Sizing = function() {
	"use strict";
	var self = {};
	var window_callbacks = [];
	var index_t;

	self.mobile = false;
	self.simple = false;
	self.small = false;
	self.song_size_np = 0;
	self.song_size = 0;
	self.timeline_header_size = 0;
	self.list_item_height = 0;
	self.height = 0;
	self.width = 0;
	self.sizeable_area_height = 0;
	self.detail_area = null;
	self.detail_header_size = 0;
	self.menu_height = 0;
	self.timeline_message_size = 45;
	self.list_height = 0;

	self.add_resize_callback = function(cb, priority) {
		if (!priority) {
			window_callbacks.push(cb);
		}
		else {
			window_callbacks.unshift(cb);
		}
	};

	self.trigger_resize = function() {
		self.height = document.documentElement.clientHeight;
		self.width = document.documentElement.clientWidth;
		self.menu_height = index_t.header.offsetHeight;
		self.list_item_height = index_t.list_item.offsetHeight;
		self.detail_header_size = index_t.detail_header_container.offsetHeight;
		var right_of_timeline = index_t.timeline_sizer.offsetLeft + index_t.timeline_sizer.offsetWidth;
		var request_width = 90;
		var detail_width = index_t.detail_container.offsetWidth;
		var lists_width = index_t.lists.offsetWidth;
		var pwr_timeline_width = self.width - request_width - detail_width - lists_width;
		self.sizeable_area_height = self.height - index_t.sizeable_area.offsetTop;
		self.list_height = self.sizeable_area_height - 80;

		index_t.sizeable_area.style.height = self.sizeable_area_height + "px";
		self.detail_area.style.height = (self.sizeable_area_height - self.detail_header_size - 20) + "px";
		self.requests_area.style.height = (self.sizeable_area_height - (self.detail_header_size * 2) - 30) + "px";

		for (var i = 0; i < index_t.sizeable_area.childNodes.length; i++) {
			index_t.sizeable_area.childNodes[i].style.height = self.sizeable_area_height + "px";
		}

		var is_small = document.body.classList.contains("small");
		var is_normal = document.body.classList.contains("normal");
		self.mobile = false;
		if (self.width < 1050) {
			self.mobile = true;
			document.body.classList.add("simple");
			document.body.classList.remove("full");
			self.simple = true;
			index_t.lists.style.left = "100%";
			index_t.requests_container.style.left = "100%";
			index_t.detail_container.style.left = "100%";

			if (self.width < 600) {
				document.body.classList.add("small");
				document.body.classList.remove("normal");
			}
			else {
				document.body.classList.remove("small");
				document.body.classList.add("normal");
			}
		}
		else {
			if (Prefs.get("pwr")) {
				document.body.classList.remove("simple");
				document.body.classList.add("full");
				self.simple = false;
				index_t.lists.style.left = null;
				index_t.requests_container.style.left = null;
				index_t.detail_container.style.left = null;
				if (self.width < 1366) {
					document.body.classList.add("small");
					document.body.classList.remove("normal");
				}
				else {
					document.body.classList.remove("small");
					document.body.classList.add("normal");
				}
			}
			else {
				document.body.classList.add("simple");
				document.body.classList.remove("full");
				self.simple = true;

				if (self.width < 600) {
					document.body.classList.add("small");
					document.body.classList.remove("normal");
				}
				else {
					document.body.classList.remove("small");
					document.body.classList.add("normal");
				}
			}
		}

		if (document.body.classList.contains("simple")) {
			index_t.timeline.style.width = null;
			index_t.lists.style.left = right_of_timeline + "px";
			index_t.requests_container.style.left = right_of_timeline + "px";
			index_t.detail_container.style.left = right_of_timeline + "px";
		}
		else {
			index_t.requests_container.style.left = null;
			index_t.timeline.style.width = pwr_timeline_width + "px";
			index_t.lists.style.left = pwr_timeline_width + "px";
			index_t.detail_container.style.left = (pwr_timeline_width + lists_width) + "px";
		}

		var size_changed = (document.body.classList.contains("normal") != is_normal) && (document.body.classList.contains("small") != is_small);

		is_small = document.body.classList.contains("small");

		if (document.body.classList.contains("simple")) {
			self.song_size_np = !is_small ? 140 : 100;
			self.song_size = !is_small ? 100 : 70;
			self.request_size = 70;
			self.timeline_header_size = 40;
		}
		else {
			self.song_size_np = 90;
			self.song_size = 70;
			self.request_size = 70;
			self.timeline_header_size = 40;
		}

		if (size_changed) {
			Timeline._reflow(null, true);
		}

		for (i = 0; i < window_callbacks.length; i++) {
			window_callbacks[i]();
		}
	};

	self.add_to_measure = function(el) {
		if (el.parentNode != self.measure_area) {
			self.measure_area.appendChild(el);
		}
	};

	self.measure_el = function(el) {
		if (el.parentNode != self.measure_area) {
			self.measure_area.appendChild(el);
		}
		var x = el.offsetWidth;
		var y = el.scrollHeight || el.offsetHeight;
		return { "width": x, "height": y };
	};

	// Firefox has a bug where we need to wait a frame to resize
	// or we get buggy widths from timeline_sizer
	// Since we also want to be responsive while resizing the window
	// we are pretty much left with no choice here but to wait until resizing is done
	// then resize again :(
	// to quote ed bighead, I hate my life
	var fx_workaround_timer;
	window.addEventListener("resize", function() {
		self.trigger_resize();
		clearTimeout(fx_workaround_timer);
		fx_workaround_timer = setTimeout(self.trigger_resize, 100);
	});

	BOOTSTRAP.on_init.push(function(t) {
		index_t = t;
		if (MOBILE) document.body.classList.add("mobile");
		else document.body.classList.add("desktop");
	});

	return self;
}();
