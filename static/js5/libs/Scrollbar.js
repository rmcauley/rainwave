var Scrollbar = function() {
	"use strict";
	var cls = {};
	var scrollbars;
	var scrollbar_width;
	var enabled = false;

	BOOTSTRAP.on_init.push(function(t) {
		BOOTSTRAP.on_measure.push(function() {
			scrollbar_width = 100 - t.scroller_size.scrollWidth;
			// if (scrollbar_width !== 0) {
			// 	enabled = true;
			// }
		});
		BOOTSTRAP.on_draw.push(function() {
			t.scroller_size.parentNode.removeChild(t.scroller_size);
		});
	});

	cls.create = function(scrollable) {
		scrollable.classList.add("scrollable");

		if (!enabled) {
			return { "el": scrollable, "set_height": function(){} };
		}

		var scrollblock = document.createElement("div");
		scrollblock.setAttribute("class", scrollable.className + " scrollblock");
		scrollable.className = "scrollable";

		if (scrollable.parentNode) {
			scrollable.parentNode.replaceChild(scrollblock, scrollable);
		}
		scrollblock.appendChild(scrollable);

		var stretcher = document.createElement("div");
		stretcher.className = "stretcher";
		scrollable.appendChild(stretcher);

		var handle = document.createElement("div");
		handle.className = "scroll_handle";
		scrollable.appendChild(handle);

		var self = {};
		self.el = scrollable;
		self.scroll_top = null;
		self.scroll_height = null;
		self.offset_height = null;
		self.reposition_hook = false;
		self.unrelated_positioning = false;

		var scrolling = false;
		var visible = false;
		var scroll_top_fresh = false;
		var handle_margin_top = 5;
		var handle_margin_bottom = 5;
		var handle_height, original_mouse_y, original_scroll_top, scroll_per_px;

		self.set_height = function(height) {
			self.scroll_height = height;
			self.scroll_top_max = Math.max(0, self.scroll_height - self.offset_height);
			self.refresh();
		};

		self.refresh = function() {
			if ((self.scroll_height === 0) || (self.offset_height === 0) || (self.scroll_height <= self.offset_height)) {
				scrollable.classList.add("scrollbar_invisible");
				handle.style.height = null;
				handle.style.top = 0;
				visible = false;
			}
			else {
				scrollable.classList.remove("scrollbar_invisible");
				visible = true;
				handle_height = Math.floor((self.offset_height - handle_margin_top - handle_margin_bottom) * (self.offset_height / self.scroll_height));
				handle_height = Math.max(handle_height, 40);
				scroll_per_px = self.scroll_top_max / (self.offset_height - handle_margin_top - handle_margin_bottom - handle_height);
				handle.style.height = handle_height + "px";
				self.reposition();
			}
		};

		self.reposition = function(e) {
			if (!visible) return;
			if (!scroll_top_fresh) self.scroll_top = scrollable.scrollTop;
			else scroll_top_fresh = false;

			var top = Math.min(1, self.scroll_top / self.scroll_top_max) * (self.offset_height - handle_margin_bottom - handle_margin_top - handle_height);
			top += self.scroll_top;
			top += handle_margin_top;
			handle.style.top = Math.floor(top) + "px";

			if (e && self.reposition_hook) self.reposition_hook();
		};

		self.scroll_to = function(px) {
			px = Math.max(0, Math.min(self.scroll_top_max, px));
			scrollable.scrollTop = px;
			self.scroll_top = scrollable.scrollTop;
		};

		var mouse_down = function(e) {
			if (scrolling) return;
			document.body.classList.add("unselectable");
			scrolling = true;
			original_mouse_y = e.screenY;
			original_scroll_top = self.scroll_top;
			window.addEventListener("mousemove", mouse_move, false);
			window.addEventListener("mouseup", mouse_up, false);
			// window.onmouseout has issues in Fx
			//window.addEventListener("mouseout", mouse_up, false);
		};

		var mouse_move = function(e) {
			var new_scroll_top = Math.floor(original_scroll_top + ((e.screenY - original_mouse_y) * scroll_per_px));
			new_scroll_top = Math.max(Math.min(new_scroll_top, self.scroll_top_max), 0);
			scrollable.scrollTop = new_scroll_top;
		};

		var mouse_up = function(e) {
			window.removeEventListener("mousemove", mouse_move, false);
			window.removeEventListener("mouseup", mouse_up, false);
			//window.removeEventListener("mouseout", mouse_up, false);
			document.body.classList.add("unselectable");
			scrolling = false;
		};

		handle.addEventListener("mousedown", mouse_down);
		scrollable.addEventListener("scroll", self.reposition);
		scrollbars.push(self);
		return self;
	};

	return cls;
}();