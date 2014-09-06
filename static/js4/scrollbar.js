var Scrollbar = function() {
	"use strict";
	var cls = {};
	var scrollbars = [];
	var resizers = [];

	cls.hold_all_recalculations = false;

	var scrollbar_width;

	// A WORD ABOUT REFLOWING/DIRTYING THE LAYOUT
	// the Recalculate functions measure widths/etc and so will trigger reflows
	// the refresh functions here will dirty the layout
	// call them very carefully

	cls.calculate_scrollbar_width = function() {
		scrollbar_width = 100 - $id("div_with_scroll").scrollWidth;
	};

	cls.get_scrollbar_width = function() {
		return scrollbar_width;
	};

	cls.recalculate = function() {
		for (var i = 0; i < scrollbars.length; i++) {
			if (!scrollbars[i].pending_self_update) {
				scrollbars[i].recalculate();
			}
		}
	};

	cls.refresh = function() {
		for (var i = 0; i < scrollbars.length; i++) {
			scrollbars[i].refresh();
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

	cls.new = function(scrollable, handle, handle_margin_top) {
		if (!handle_margin_top && (handle_margin_top !== 0)) handle_margin_top = 3;
		var handle_margin_bottom = 3;

		var self = {};
		self.scroll_top = null;
		self.scroll_top_max = null;
		self.scroll_height = null;
		self.offset_height = null;
		self.pending_self_update = false;
		self.reposition_hook = false;
		self.unrelated_positioning = false;
		self.delay_force_height = null;

		var scrolling = false;
		var visible = false;
		var scroll_top_fresh = false;
		var handle_height, original_mouse_y, original_scroll_top, scroll_per_px;

		self.set_handle_margin_bottom = function(n) {
			handle_margin_bottom = n;
		};

		self.recalculate = function(force_height, offset_height) {
			if (cls.hold_all_recalculations) return;
			self.scroll_height = force_height || self.delay_force_height || scrollable.scrollHeight;
			if (self.delay_force_height) self.delay_force_height = null;
			self.offset_height = offset_height || scrollable.parentNode.offsetHeight;
			self.scroll_top = scrollable.scrollTop;
			self.scroll_top_max = (self.scroll_height - self.offset_height);
			scroll_top_fresh = true;
			self.pending_self_update = false;
		};

		self.refresh = function() {
			if ((self.scroll_height === 0) || (self.offset_height === 0) || (self.scroll_height <= self.offset_height)) {
				if (visible) $add_class(handle, "scrollbar_invisible");
				handle.style.height = null;
				visible = false;
			}
			else {
				if (!visible) $remove_class(handle, "scrollbar_invisible");
				visible = true;

				handle_height = Math.floor((self.offset_height - handle_margin_top - handle_margin_bottom) * (self.offset_height / self.scroll_height));
				handle_height = Math.max(handle_height, 50);
				scroll_per_px = self.scroll_top_max / (self.offset_height - handle_margin_top - handle_margin_bottom - handle_height);
				handle.style.height = handle_height + "px";
				self.reposition();
			}
		};

		self.scroll_to = function(px) {
			px = Math.max(0, Math.min(self.scroll_top_max, px))
			scrollable.scrollTop = px;
			self.scroll_top = px;
			scroll_top_fresh = true;
		};

		self.reposition = function(e) {
			if (!visible) return;
			if (!scroll_top_fresh) self.scroll_top = scrollable.scrollTop;
			else scroll_top_fresh = false;

			var top = (self.scroll_top / self.scroll_top_max) * (self.offset_height - handle_margin_bottom - handle_margin_top - handle_height);
			if (!self.unrelated_positioning) top += self.scroll_top;
			handle.style.top = handle_margin_top + Math.floor(top) + "px";

			if (e && self.reposition_hook) self.reposition_hook();
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
			var new_scroll_top = Math.floor(original_scroll_top + ((e.screenY - original_mouse_y) * scroll_per_px));
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
		scrollable.addEventListener("scroll", self.reposition);
		scrollbars.push(self);
		return self;
	};

	cls.new_resizer = function(scrollblock, scrollable, resizer) {
		var self = {};
		var scrollables = [ scrollable ];
		var original_mouse_x;
		var resizing = false;
		var min_width = 280;
		var done_min_width;

		Prefs.define("resize_" + scrollblock.id);
		self.size = Prefs.get("resize_" + scrollblock.id);

		self.add_scrollable = function(scrollable) {
			scrollables.push(scrollable);
		};

		self.save = function() {
			Prefs.change("resize_" + scrollblock.id, self.size);
		};
		
		self.calculate = function() {
			if (MOBILE) return;
			if (!self.size) {
				self.size = scrollblock.offsetWidth;
				self.save();
			}
		};

		self.resize = function(new_size) {
			if (MOBILE) return;
			new_size = new_size || self.size;
			scrollblock.style.width = new_size + "px";
			for (var i = 0; i < scrollables.length; i++) {
				if (!done_min_width) scrollables[i].style.minWidth = (min_width + scrollbar_width) + "px";
				scrollables[i].style.width = (new_size + scrollbar_width) + "px";
			}
			done_min_width = true;
			if (self.callback) self.callback();
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
			self.size = Math.round(self.size + (e.screenX - original_mouse_x));
			self.save();
		};

		resizer.addEventListener("mousedown", mouse_down);
		resizers.push(self);
		return self;
	};

	return cls;
}();