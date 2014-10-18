var ErrorHandler = function() {
	"use strict";
	var self = {};
	var container;
	var permanent_errors = {};
	var number_of_debug_divs = -1;

	var cancel_png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAYAAAByDd+UAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6QTQ2OURBQ0Y4MUM1MTFFM0I5NzA4QjYwRkU3NTUzMTMiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6QTQ2OURBRDA4MUM1MTFFM0I5NzA4QjYwRkU3NTUzMTMiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpBNDY5REFDRDgxQzUxMUUzQjk3MDhCNjBGRTc1NTMxMyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpBNDY5REFDRTgxQzUxMUUzQjk3MDhCNjBGRTc1NTMxMyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pge6x9cAAAFhSURBVHjaYvz//z8DFlADxDpAHMFAHpgJxH+BOAtDBmQhGg78jwDTsMgTwhVI+svR5dEVh/zHBKRYWoVFfx4uC7FZBgMzibCsEo/+MnQLA/8TBpOIDEZcIBtmYel/4sFcIoMRF5jMAA0uUsAkEn2GDPbANDaTqLEGiJNJ1LMIPdGQaikpYBmubNFFA8uW4MuHIFxPRcsWE8r4MNxNzWAkxkIQbqDAsoW4zCVUeuSSYVkPPjOZCJT6n8moKb7ilaWwuMIFppEapFVUSDTTiLWwkorZYiYhCytokPF7cVlYTsOibQq6hQUkGjAZiGtJ1NMJs3AyiRpXI4VKL4l614PyITcJeWwDEIci8YuBuJcE/dwwl7YS4bo1ePLsRCL0z0dPNPVEBiMu3IlH/wJc2aIDW7iT0Eycgs8yXBm/BknxSjIawsg+nYcuz4ijqb8EiKWB2JHMpv5aIOYEYi90CYAAAwCZ7IntPjVB6QAAAABJRU5ErkJggg==";

	self.initialize = function() {
		API.add_callback(self.permanent_error, "station_offline");
		API.add_universal_callback(self.tooltip_error);

		container = $id("messages");
		$id("measure_box").appendChild($el("img", { "src": cancel_png, "alt": "X", "width": "14", "height": "14" }));
	};

	self.make_error = function(tl_key, code) {
		return { "tl_key": tl_key, "code": code, "text": $l(tl_key) };
	};

	self.permanent_error = function(json, append_element) {
		if (!(json.tl_key in permanent_errors)) {
			var err = json;
			err.el = $el("div", { "class": "error" });
			err.hide = err.el.appendChild($el("img", { "src": cancel_png, "alt": "X", "width": "14", "height": "14" }));
			err.hide.addEventListener("click", function() { self.remove_permanent_error(err.tl_key); });
			err.el.appendChild($el("span", { "textContent": err.text + " " }));
			if (append_element) err.el.appendChild(append_element);
			container.appendChild(err.el);
			permanent_errors[json.tl_key] = err;
		}
	};

	self.remove_permanent_error = function(tl_key) {
		if (tl_key in permanent_errors) {
			Fx.remove_element(permanent_errors[tl_key].el);
			delete permanent_errors[tl_key];
		}
	};

	self.modal_error = function(el) {
		API.sync_stop();
		if ($id("modal_background")) return;
		document.body.insertBefore($el("div", { "id": "modal_background" }), document.body.firstChild);
		document.body.insertBefore(el, document.body.firstChild);
	};

	self.tooltip_error = function(callback_name, json) {
		if (!json) return;
		if (("success" in json) && (!json.success)) {
			var err = $el("div", { "class": "error_tooltip", "textContent": json.text });

			var m = $measure_el(err);
			var x = Mouse.x - 5;
			var y = Mouse.y - m.height - 2;
			if (y < 30) y = 30;
			if (x > (SCREEN_WIDTH - m.width)) x = SCREEN_WIDTH - m.width - 15;
			if (y > (SCREEN_HEIGHT - m.height)) y = SCREEN_HEIGHT - m.height - 15;
			err.style.left = x + "px";
			err.style.top = y + "px";

			document.body.appendChild(err);
			Fx.delay_css_setting(err, "opacity", 1);
			setTimeout(function() { Fx.remove_element(err); }, 5000);
		}
	};

	self.javascript_error = function(err, json) {
		var error_el = $el("div", { "id": "error_javascript" }, [
			$el("h4", { "textContent": $l("catastrophic_error") }),
			$el("a", { "href": "http://rainwave.cc/forums/viewforum.php?f=27", "textContent": $l("submit_javascript_error") }),
			$el("textarea", { "textContent": err.message + "\n" + err.name + "\n\n" + err.stack + "\n\nServer response:\n" + JSON.stringify(json) + "\n" })
		]);
		self.modal_error(error_el);
	};

	self.make_debug_div = function() {
		number_of_debug_divs++;
		return document.getElementsByTagName("body")[0].appendChild($el("div", { "class": "debug_div", "style": "top: " + (50 + (number_of_debug_divs * 20)) + "px;" }));
	};

	return self;
}();
