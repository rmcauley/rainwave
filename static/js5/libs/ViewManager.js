var View = function(route) {
	"use strict";
	var self = {};
	self.route = route;
	self.visible = false;
	self.loaded = false;
	self.onclose = null;
	self.onopen = null;
	self.draw = null;
	self.load = null;
	self.tabchange = null;

	self.reload = function() {
		while (self.el.firstChild) {
			self.el.removeChild(self.el.firstChild);
		}
		self.loaded = false;
		if (self.visible && self.load) {
			self.load();
		}
	};

	return self;
};

var ViewManager = function() {
	var self = {};
	self.visible_view = null;
	var views = [];

	var close_view = function(view) {
		view.visible = false;
		if (view.onclose) {
			view.onclose();
		}
		if (view.el && view.el.parentNode) {
			view.el.parentNode.removeChild(view.el);
		}
	};

	self.close_views = function(limit) {
		limit = limit || 0;
		var v;
		while (views.length > limit) {
			v = views.shift();
			close_view(v);
			self.delete_route(v.route);
		}
		if (views.length === 0) {
			self.visible_view = null;
		}
	};

	self.add_view = function(view) {
		self.close_views(5);
		views.push(view);

		Router.register_route(view.route);
	};

	self.open_view = function(view) {
		if (self.visible_view) {
			close_window(self.visible_view);
		}
		
		if (!view.loaded) {
			return view.load();
		}

		self.visible_view = view;
		view.visible = true;
		if (self.view_container) {
			el.appendChild(view.el);
		}
		if (view.onopen) {
			view.onopen();
		}
		if (view.tabchange) {
			view.tabchange();
		}
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