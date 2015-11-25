var Scrollbar = function() {
	"use strict";
	var cls = {};
	var scrollbars = [];
	var scrollbar_width;
	var enabled = false;

	BOOTSTRAP.on_init.push(function(t) {
		// if we're on mobile we won't need this due to mobile scrollbars being great
		if (MOBILE) return;
		// if we're on Chrome we have custom scrollbars that don't need Javascript
		// http://stackoverflow.com/questions/4565112/javascript-how-to-find-out-if-the-user-browser-is-chrome
		var isChromium = window.chrome, vendorName = window.navigator.vendor, isOpera = window.navigator.userAgent.indexOf("OPR") > -1;
		if (isChromium !== null && isChromium !== undefined && vendorName === "Google Inc." && isOpera === false) {
		   return;
		}

		BOOTSTRAP.on_measure.push(function() {
			scrollbar_width = 100 - t.scroller_size.scrollWidth;
			// if scrollbars are 0 width (as they are on mobile, or Mac OS) we don't need customs
			if (scrollbar_width !== 0) {
				enabled = true;
				document.body.classList.add("custom_scrollbars");
			}
		});

		Sizing.add_resize_callback(function() {
			scrollbar_width = 100 - t.scroller_size.scrollWidth;
			for (var i = 0; i < scrollbars.length; i++) {
				scrollbars[i].offset_height = scrollbars[i].scrollblock.offsetHeight;
				scrollbars[i].offset_width = 0;
				var el = scrollbars[i].scrollblock;
				while (!scrollbars[i].offset_width && el) {
					scrollbars[i].offset_width = el.offsetWidth;
					el = el.parentNode;
				}
			}
			for (i = 0; i < scrollbars.length; i++) {
				scrollbars[i].el.style.width = (scrollbars[i].offset_width + scrollbar_width) + "px";
				scrollbars[i].el.style.height = scrollbars[i].offset_height + "px";
			}
		}, true);
	});

	var handle_margin_top = 5;
	var handle_margin_bottom = 5;

	var no_op = function() { return; };

	cls.is_enabled = enabled;

	cls.create = function(scrollable, always_scrollblock, always_hook) {
		var self = {};
		self.scrollblock = scrollable;
		self.el = scrollable;
		self.scroll_top = null;
		self.scroll_height = null;
		self.offset_height = null;
		self.scroll_top_max = null;
		self.reposition_hook = null;
		self.refresh = no_op;

		self.el.classList.add("scrollable");

		if (enabled || always_scrollblock) {
			self.scrollblock = document.createElement("div");
			self.scrollblock.setAttribute("class", "scrollblock");
			if (self.el.className) {
				self.scrollblock.setAttribute("class", "scrollblock " + self.el.className);
			}
			if (enabled) {
				self.el.setAttribute("class", "scrollable");
				self.el.style.overflowY = "scroll";
			}

			if (self.el.parentNode) {
				self.el.parentNode.replaceChild(self.scrollblock, self.el);
			}
			self.scrollblock.appendChild(self.el);
		}

		if (!enabled) {
			var force_height;
			if (always_hook) {
				self.refresh = function() {
					self.scroll_height = force_height || self.el.scrollHeight;
					self.offset_height = self.scrollblock.offsetHeight;
					self.scroll_top_max = self.scroll_height - self.offset_height;
				};
				self.scrollblock.addEventListener("scroll", function() {
					self.scroll_top = self.scrollblock.scrollTop;
					if (self.reposition_hook) self.reposition_hook();
				});
			}

			if (always_scrollblock) {
				self.scrollblock.style.overflowY = "scroll";
				self.set_height = function(h) {
					self.el.style.height = h + "px";
					self.refresh();
				};
				self.scroll_to = function(n) { self.scrollblock.scrollTop = n; };
			}
			else {
				self.set_height = function(n) {
					force_height = n;
					self.refresh();
				};
				self.scroll_to = function(n) { self.scrollblock.scrollTop = n; };
			}

			return self;
		}

		var handle = document.createElement("div");
		handle.className = "scroll_handle invisible";
		self.scrollblock.insertBefore(handle, self.scrollblock.firstChild);

		var scrolling = false;
		var visible = false;
		var handle_height, original_mouse_y, original_scroll_top, scroll_per_px;

		self.set_height = function(height) {
			if (!height && height !== false && height !== 0) {
				console.warn("Invalid argument for scrollable height.");
			}
			if (height !== false) {
				if (height === self.scroll_height) return;
				self.scroll_height = height !== undefined ? height : self.el.scrollHeight;
			}
			else {
				self.scroll_height = self.el.scrollHeight;
			}
			self.scroll_top_max = Math.max(0, self.scroll_height - self.offset_height);
			self.refresh();
		};

		self.refresh = function() {
			if ((self.scroll_height === 0) || (self.offset_height === 0) || (self.scroll_height <= self.offset_height)) {
				handle.classList.add("invisible");
				handle.style.height = null;
				handle.style.top = null;
				visible = false;
			}
			else {
				handle.classList.remove("invisible");
				visible = true;
				var wheight = self.offset_height - handle_margin_top - handle_margin_bottom;
				handle_height = Math.floor(wheight * (self.offset_height / self.scroll_height));
				handle_height = Math.max(handle_height, 40);
				handle.style.height = handle_height + "px";
				scroll_per_px = self.scroll_top_max / (wheight - handle_height);
				self.reposition();
			}
		};

		self.reposition = function(e) {
			if (!visible) {
				return;
			}
			if (e) {
				self.scroll_top = scrollable.scrollTop;
			}

			var top = Math.min(1, self.scroll_top / self.scroll_top_max) * (self.offset_height - handle_margin_bottom - handle_margin_top - handle_height);
			handle.style[Fx.transform] = "translateX(-8px) translateY(" + Math.floor(handle_margin_top + top) + "px)";

			if (self.reposition_hook) self.reposition_hook();
		};

		self.scroll_to = function(px) {
			px = Math.max(0, Math.min(self.scroll_top_max, px));
			if (px !== self.scroll_top) {
				scrollable.scrollTop = px;
				self.scroll_top = px;
			}
			else if (self.reposition_hook) {
				self.reposition_hook();
			}
		};

		var mouse_down = function(e) {
			if (scrolling) return;
			document.body.classList.add("unselectable");
			scrolling = true;
			original_mouse_y = e.screenY;
			original_scroll_top = self.scroll_top;
			window.addEventListener("mousemove", mouse_move, false);
			window.addEventListener("mouseup", mouse_up, false);
			handle.classList.add("active");
			// window.onmouseout has issues in Fx
			//window.addEventListener("mouseout", mouse_up, false);
		};

		var mouse_move = function(e) {
			var new_scroll_top = Math.floor(original_scroll_top + ((e.screenY - original_mouse_y) * scroll_per_px));
			new_scroll_top = Math.max(Math.min(new_scroll_top, self.scroll_top_max), 0);
			scrollable.scrollTop = new_scroll_top;
		};

		var mouse_up = function(e) {
			handle.classList.remove("active");
			window.removeEventListener("mousemove", mouse_move, false);
			window.removeEventListener("mouseup", mouse_up, false);
			//window.removeEventListener("mouseout", mouse_up, false);
			document.body.classList.remove("unselectable");
			scrolling = false;
		};

		self.set_hook = function(fn) {
			self.reposition_hook = fn;
		};

		handle.addEventListener("mousedown", mouse_down);
		scrollable.addEventListener("scroll", self.reposition);
		scrollbars.push(self);
		return self;
	};

	return cls;
}();
