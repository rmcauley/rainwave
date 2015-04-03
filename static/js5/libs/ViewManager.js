var ViewManager = function(el) {
	"use strict";
	var self = {};
	self.visible_view = null;
	var open_views = [];

	var BaseView = function(id) {
		var self = {};
		self.id = id;
		self.el = document.createElement("div");

		self.onclose = function() {};
		self.onopen = self.onclose;
		self.draw = self.onclose;
		self.load = self.onclose;
		self.is_loaded = function() { return true; };
		self.reopen = function() {
			while (self.el.firstChild) {
				self.el.removeChild(self.el.firstChild);
				self.load();
			}
		};

		self.open = function() {
			if (!self.is_loaded()) {
				self.load();
			}
			else {
				self.draw();
			}
		};

		return self;
	};

	var close_window = function(view) {
		view.visible = false;
		if (view.onclose) {
			view.onclose();
		}
		if (view.el.parentNode) {
			view.el.parentNode.removeChild(view.el);
		}
	};

	self.close_all = function() {
		while (open_views.length) {
			close_window(open_views.shift());
		}
		self.visible_view = null;
	};

	self.open = function(id, render_function) {
		var view;
		for (var i = 0; i < open_views.length; i++) {
			if (open_views[i].id === id) {
				view = open_views[i];
			}
		}

		if (!view) {
			while (open_views.length > 5) {
				close_window(open_views.shift());
			}
			view = BaseView(id);
			render_function(view);
			open_views.push(view);
		}

		// close the currently visible window if there isone
		if (self.visible_view) {
			close_window(self.visible_view);
		}

		// switch to this one
		self.visible_view = view;
		view.visible = true;
		el.appendChild(view.el);
		if (view.onopen) {
			view.onopen();
		}

		return view;
	};

	var visibilityEventNames = {};
	if (typeof document.hidden !== "undefined") {
		visibilityEventNames.hidden = "hidden";
		visibilityEventNames.change = "visibilitychange";
	}
	else if (typeof document.mozHidden !== "undefined") {
		visibilityEventNames.hidden = "mozHidden";
		visibilityEventNames.hange = "mozvisibilitychange";
	}
	else if (typeof document.msHidden !== "undefined") {
		visibilityEventNames.hidden = "msHidden";
		visibilityEventNames.visibilityChange = "msvisibilitychange";
	}
	else if (typeof document.webkitHidden !== "undefined") {
		visibilityEventNames.hidden = "webkitHidden";
		visibilityEventNames.visibilityChange = "webkitvisibilitychange";
	}

	var handle_visibility_change = function() {
		if (!self.visible_view) return;
		if (document[visibilityEventNames.hidden] && self.visible_view.onclose) {
			self.visible_view.onclose();
		}
		else if (self.visible_view.onopen) {
			self.visible_view.onopen();
		}
	};

	if (visibilityEventNames && visibilityEventNames.change && document.addEventListener) {
		document.addEventListener(visibilityEventNames.change, handle_visibility_change, false);
	}

	return self;
}();