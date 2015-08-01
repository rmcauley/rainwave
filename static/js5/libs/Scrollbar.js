var Scrollbar = function() {
	"use strict";
	var cls = {};
	var scrollbars = [];
	var scrollbar_width;
	var enabled = false;

	BOOTSTRAP.on_init.push(function(t) {
		BOOTSTRAP.on_draw.push(function() {
			t.scroller_size.parentNode.removeChild(t.scroller_size);
		});

		if (MOBILE) return;
		// http://stackoverflow.com/questions/4565112/javascript-how-to-find-out-if-the-user-browser-is-chrome
		var isChromium = window.chrome, vendorName = window.navigator.vendor, isOpera = window.navigator.userAgent.indexOf("OPR") > -1;
		if (isChromium !== null && isChromium !== undefined && vendorName === "Google Inc." && isOpera === false) {
		   return;
		}

		BOOTSTRAP.on_measure.push(function() {
			scrollbar_width = 100 - t.scroller_size.scrollWidth;
			if (scrollbar_width !== 0) {
				enabled = true;
			}
		});

		Sizing.add_resize_callback(function() {
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

	cls.create = function(scrollable, always_scrollable, always_hook) {
		var scrollblock;
		// always scrollable is beneficial as an option because the only place we need an extra
		// scrollblock-wrapping div is for the timeline
		// all other scrollable <divs> can be just set by themselves but the timeline
		// has some special width handling that requires a wrapping element at all times.
		if (enabled || always_scrollable) {
			scrollblock = document.createElement("div");
			scrollblock.setAttribute("class", "scrollblock");
			scrollable.style.overflowY = "auto";
			if (scrollable.className) {
				scrollblock.setAttribute("class", "scrollblock " + scrollable.className);
			}
			scrollable.setAttribute("class", "scrollable");
		
			if (scrollable.parentNode) {
				scrollable.parentNode.replaceChild(scrollblock, scrollable);
			}
			scrollblock.appendChild(scrollable);
		}
		else {
			scrollable.classList.add("scrollable");
		}

		var reposition_hook = false;

		var self = {};
		self.scrollblock = scrollblock || scrollable;
		self.el = scrollable;
		self.scroll_top = null;
		self.scroll_height = null;
		self.offset_height = null;
		self.scroll_top_max = null;
		if (!enabled) {
			if (always_scrollable) {
				self.set_height = function(h) { scrollable.style.height = h + "px"; };
			}
			else {
				self.set_height = function(h) { /* pass */ };
			}
			self.scroll_to = function(n) { self.scrollable.scrollTop = n; };
			if (always_hook) {
				self.refresh = function() {
					self.scroll_height = self.el.scrollHeight;
					self.offset_height = self.scrollblock.offsetHeight;
					self.scroll_top_max = self.scroll_height - self.offset_height;
				};
				self.set_hook = function(fn) { 
					reposition_hook = fn;
				};
				scrollable.addEventListener("scroll", function() {
					self.scroll_top = self.el.scrollTop;
					if (reposition_hook) reposition_hook();
				});
			}
			else {
				self.refresh = self.set_height;
				self.set_hook = function(fn) { scrollable.addEventListener("scroll", fn); };
			}
			return self;
		}

		var handle = document.createElement("div");
		handle.className = "scroll_handle";
		scrollblock.insertBefore(handle, scrollblock.firstChild);

		var scrolling = false;
		var visible = false;
		var handle_height, original_mouse_y, original_scroll_top, scroll_per_px;

		self.set_height = function(height) {
			if (!height && height !== false && height !== 0) {
				throw("Invalid argument for scrollable height.");
			}
			self.scroll_height = height || self.el.scrollHeight;
			self.scroll_top_max = Math.max(0, self.scroll_height - self.offset_height);
			self.refresh();
		};

		self.refresh = function() {
			if ((self.scroll_height === 0) || (self.offset_height === 0) || (self.scroll_height <= self.offset_height)) {
				handle.classList.add("invisible");
				handle.style.height = null;
				handle.style.top = null;
				self.el.style.paddingRight = scrollbar_width + "px";
				visible = false;
			}
			else {
				handle.classList.remove("invisible");
				visible = true;
				var wheight = self.offset_height - handle_margin_top - handle_margin_bottom;
				handle_height = Math.floor(wheight * (self.offset_height / self.scroll_height));
				handle_height = Math.max(handle_height, 40);
				handle.style.height = handle_height + "px";
				self.el.style.paddingRight = "0";
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
			handle.style[Fx.transform] = "translateX(-12px) translateY(" + Math.floor(handle_margin_top + top) + "px)";

			if (reposition_hook) reposition_hook();
		};

		self.scroll_to = function(px) {
			px = Math.max(0, Math.min(self.scroll_top_max, px));
			if (px !== self.scroll_top) {
				scrollable.scrollTop = px;
				self.scroll_top = px;
			}
			else if (reposition_hook) {
				reposition_hook();
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
			reposition_hook = fn;
		};

		handle.addEventListener("mousedown", mouse_down);
		scrollable.addEventListener("scroll", self.reposition);
		scrollbars.push(self);
		return self;
	};

	return cls;
}();