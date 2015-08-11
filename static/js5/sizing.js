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
		self.list_item_height = index_t.list_item.offsetHeight;
		var right_of_timeline;
		if (index_t.timeline.parentNode == index_t.sizeable_area) {
			right_of_timeline = index_t.timeline.offsetLeft + index_t.timeline.offsetWidth;
		}
		else {
			right_of_timeline = index_t.timeline.parentNode.offsetLeft + index_t.timeline.parentNode.offsetWidth;
		}
		self.sizeable_area_height = self.height - index_t.sizeable_area.offsetTop;
		index_t.sizeable_area.style.height = self.sizeable_area_height + "px";

		for (var i = 0; i < index_t.sizeable_area.childNodes.length; i++) {
			index_t.sizeable_area.childNodes[i].style.height = self.sizeable_area_height + "px";
		}

		self.mobile = false;
		if (self.width < 1050) {
			self.mobile = true;
			document.body.classList.add("simple");
			document.body.classList.remove("full");
			self.simple = true;
			index_t.lists.style.left = "100%";
			self.requests_area.style.left = "100%";
			self.detail_area.style.left = "100%";
		}
		else {
			if (Prefs.get("adv")) {
				document.body.classList.remove("simple");
				document.body.classList.add("full");
				self.simple = false;
				index_t.lists.style.left = null;
				self.requests_area.style.left = null;
				self.detail_area.style.left = null;
			}
			else {
				document.body.classList.add("simple");
				document.body.classList.remove("full");
				self.simple = true;
				index_t.lists.style.left = right_of_timeline + "px";
				self.requests_area.style.left = right_of_timeline + "px";
				self.detail_area.style.left = right_of_timeline + "px";
			}

			if (self.width < 1366) {
				document.body.classList.add("small");
				document.body.classList.remove("normal");
			}
			else {
				document.body.classList.remove("small");
				document.body.classList.add("normal");
			}
		}

		self.song_size_np = self.simple && !MOBILE ? 140 : 100;
		self.song_size = self.simple && !MOBILE ? 100 : 70;
		self.request_size = 70;
		self.timeline_header_size = 40;

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

	window.addEventListener("resize", self.trigger_resize);

	BOOTSTRAP.on_init.push(function(t) {
		index_t = t;
		if (MOBILE) document.body.classList.add("mobile");
		else document.body.classList.add("desktop");
	});

	return self;
}();
