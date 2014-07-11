var Scrollbar = function() {
	"use strict";
	var cls = {};
	var scrollbars = [];
	var resizers = [];

	var scrollbar_width;

	// A WORD ABOUT REFLOWING/DIRTYING THE LAYOUT
	// the Recalculate functions measure widths/etc and so will trigger reflows
	// the refresh functions here will dirty the layout
	// call them very carefully

	cls.calculate_scrollbar_width = function() {
		scrollbar_width = 100 - $id("div_with_scroll").offsetWidth;
	}

	cls.recalculate = function() {
		for (var i = 0; i < scrollbars.length; i++) {
			scrollbars[i].recalculate();
		}
	};

	cls.refresh = function() {
		for (var i = 0; i < scrollbars.length; i++) {
			scrollbars[i].refresh();
		}
		for (i = 0; i < resizers.length; i++) {
			resizers[i].reposition();
		}
	};

	cls.resizer_calculate = function() {
		for (var i = 0; i < resizers.length; i++) {
			resizers[i].calculate();
		}
	};

	cls.resizer_refresh = function() {
		for (var i = 0; i < resizers.length; i++) {
			resizers[i].resize();
		}
	};

	cls.new = function(scrollblock, scrollable, handle, handle_margin_top) {
		if (!handle_margin_top) handle_margin_top = 3;
		var handle_margin_bottom = 3;

		var self = {};
		self.scroll_top = null;
		self.scroll_top_max = null;
		self.scroll_height = null;
		self.offset_height = null;

		var scrolling = false;
		var visible = false;
		var scroll_top_fresh = false;
		var scrollpx_per_handlepx, original_mouse_y, original_scroll_top;

		self.recalculate = function() {
			self.scroll_height = scrollable.scrollHeight;
			self.offset_height = scrollable.offsetHeight;
			self.scroll_top = scrollable.scrollTop;
			self.scroll_top_max = scrollable.scrollTopMax;
			scroll_top_fresh = true;
		};

		self.refresh = function() {
			if ((self.scroll_height === 0) || (self.offset_height === 0) || (self.scroll_height <= self.offset_height)) {
				if (visible) $add_class(handle, "scrollbar_invisible");
				visible = false;
			}
			else {
				if (!visible) $remove_class(handle, "scrollbar_invisible");
				visible = true;

				handle_height = Math.max(Math.round((self.offset_height - handle_margin_top - handle_margin_bottom) / self.scroll_height * self.offset_height), 70);
				scrollpx_per_handlepx = self.scroll_top_max / self.offset_height;
				handle.style.height = handle_height + "px";
			}
		};

		self.reposition = function(e) {
			if (!visible) return;
			if (!scroll_top_fresh) self.scroll_top = scrollable.scrollTop;
			else scroll_top_fresh = false;
			handle.style.top = (handle_margin_top + (Math.round((self.scroll_top / self.scroll_top_max) * (self.offset_height - 6))) + "px";
		};

		var mouse_down = function(e) {
			if (scrolling) return;
			$add_class(document.body, "unselectable");
			scrolling = true;
			original_mouse_y = e.screenY;
			original_scroll_top = self.scroll_top;
			window.addEventListener("mousemove", mouse_move, false);
			window.addEventListener("mouseup", mouse_up, false);
			// window.onmouseout has issues in Fx
			//window.addEventListener("mouseout", mouse_up, false);
		};

		var mouse_move = function(e) {
			var new_scroll_top = Math.round(original_scroll_top + ((e.screenY - original_mouse_y) * scrollpx_per_handlepx));
			new_scroll_top = Math.max(Math.min(new_scroll_top, self.scroll_top_max), 0);
			scrollable.scrollTop = new_scroll_top;
		};

		var mouse_up = function(e) {
			window.removeEventListener("mousemove", mouse_move, false);
			window.removeEventListener("mouseup", mouse_up, false);
			//window.removeEventListener("mouseout", mouse_up, false);
			$remove_class(document.body, "unselectable");
			scrolling = false;
		};

		handle.addEventListener("mousedown", mouse_down);
		scrollable.addEventListener("scroll", reposition);
		scrollbars.push(self);
		return self;
	};

	cls.new_resizer = function(scrollblock, scrollable, resizer) {
		var self = {};
		var scrollables = [ scrollable ];
		var original_mouse_x;
		var resizing = false;

		Prefs.define("resize_" + element.id);
		self.size = Prefs.get("resize_" + element.id);

		self.add_scrollable = function(scrollable) {
			scrollables.push(scrollable);
		};

		self.save = function() {
			Prefs.set("resize_" + element.id, self.size);
		};
		
		self.calculate = function() {
			if (!self.size) {
				self.size = scrollblock.offsetWidth;
				self.save();
			}
		};

		self.resize = function(new_size) {
			new_size = new_size || self.size;
			scrollblock.style.width = new_size + "px";
			for (var i = 0; i < scrollables.length; i++) {
				scrollable.style.width = (new_size + scrollbar_width) + "px";
			}
		};

		var mouse_down = function(e) {
			if (resizing) return;
			$add_class(document.body, "unselectable");
			resizing = true;
			original_mouse_x = e.screenX;
			window.addEventListener("mousemove", mouse_move);
			window.addEventListener("mouseup", mouse_up);
		};

		var mouse_move = function(e) {
			self.resize(Math.round(self.size + (e.screenX - original_mouse_x)));
		};

		var mouse_up = function(e) {
			window.removeEventListener("mousemove", mouse_move);
			window.removeEventListener("mouseup", mouse_up);
			$remove_class(document.body, "unselectable");
			resizing = false;
			self.size = resizer.offsetWidth;
			Prefs.change("resizer_" + resizer.id, self.size);
			self.save();
		};

		resizer.addEventListener("mousedown", mouse_down);
		return self;
	};

	return cls;
}();