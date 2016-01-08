/* eslint eqeqeq:0 */
/* global ga */

(function() {
	"use strict";

	var self = {};
	window.Router = self;
	self.current_route = [ null, null ];
	self.previous_route = [ null, null ];
	self.routes = {};
	var oldURL, lastopen; // , disappearTimer;
	var first = true;

	self.getCurrentRoute = function() {
		var deeplinkurl = decodeURI(location.href);
		if (deeplinkurl.indexOf("?") >= 0) {
			self.strip_get_query();
			deeplinkurl = decodeURI(location.href);
		}
		if (deeplinkurl.indexOf("#!/") >= 0) {
			return deeplinkurl.substring(deeplinkurl.indexOf("#!/") + 3).split("/");
		}
		return [];
	};

	self.detect_url_change = function() {
		var changed = false;
		var old = self.current_route;
		self.current_route = self.getCurrentRoute();
		if ((oldURL != location.href) && (old.join() != self.current_route.join())) {
			self.previous_route = old;
			if (typeof(ga) == "object") ga("send", "pageview", "/" + self.current_route.join("/"));
			var args = self.current_route;
			if (args.length) {
				self.open_route.apply(this, args);
				changed = true;
			}
			oldURL = location.href;
		}
		if (changed && first) {
			first = false;
		}
		return changed;
	};

	var showPage = function(typ, id, page) {
		var el = document.getElementById("content");
		// if (!document.body.classList.contains("animate")) {
		while (el.firstChild) {
			el.removeChild(el.firstChild);
		}
		el.appendChild(page);
		return;
		// }
	};

	// var disappear = function() {
	// 	disappearTimer = null;
	// 	var el = document.getElementById("content");
	// 	var pages = el.querySelectorAll("div.page");
	// 	for (var i = 0; i < pages.length; i++) {
	// 		if (pages[i].classList.contains("disappearing")) {
	// 			pages[i].parentNode.removeChild(pages[i]);
	// 			pages[i].classList.remove("disappearing");
	// 			pages[i].classList.remove("page_bottom");
	// 			pages[i].classList.remove("page_top");
	// 			pages[i].classList.remove("page_left");
	// 			pages[i].classList.remove("page_right");
	// 		}
	// 	}
	// };

	var getNewDiv = function() {
		var div = document.createElement("div");
		div.className = "page";
		return div;
	};

	self.open_route = function(typ, id) {
		if ((typ == "session") && id) {
			lastopen = id;
		}
		if (self.routes.hasOwnProperty(typ)) {
			if (!id && self.routes[typ]._index) {
				if (typeof(self.routes[typ]._index) == "function") {
					self.routes[typ]._index = self.routes[typ]._index(getNewDiv());
				}
				if (self.routes[typ]._index) {
					showPage(typ, id, self.routes[typ]._index.$t._root);
				}
			}
			else if (self.routes[typ][id] && (!self.routes[typ][id]._force_reload || !self.routes[typ][id]._loaded)) {
				showPage(typ, id, self.routes[typ][id]);
				if (self.routes[typ][id]._force_reload) {
					self.routes[typ][id]._loaded = true;
				}
			}
			else if (self.routes[typ]._load_new) {
				var currentURL = window.location.href;
				var result = self.routes[typ]._load_new(id, getNewDiv(), function(div) {
					if (div) {
						self.routes[typ][id] = div;
						if (currentURL == window.location.href) {
							self.open_route(typ, id);
						}
					}
					else {
						self.fourohfour();
					}
				});
				if (!result) {
					self.fourohfour();
				}
			}
			else {
				self.fourohfour();
			}
		}
		else {
			self.fourohfour();
		}
	};

	self.fourohfour = function() {
		showPage(self.current_route[0], self.current_route[1], RWTemplates.fourohfour().page[0]);
	};

	self.change = function() {
		// each argument passed in to this function is changed into a URL
		// this function deals with where to place things after the #!
		var r = Array.prototype.join.call(arguments, "/");
		var newurl = decodeURI(location.href);
		if (newurl.indexOf("?") >= 0) {
			newurl = newurl.slice(0, newurl.indexOf("?"));
		}
		if (newurl.indexOf("#") >= 0) {
			newurl = newurl.substring(0, newurl.indexOf("#")) + "#!/" + r;
		}
		else {
			newurl = newurl + "#!/" + r;
		}
		if (oldURL == newurl) {
			oldURL = null;
		}
		else {
			location.href = newurl;
		}
		self.detect_url_change();
	};

	self.strip_get_query = function() {
		var url = window.location.protocol + "//" + window.location.host + window.location.pathname;
		if (window.location.href.indexOf("#") >= 0) {
			url += window.location.href.slice(window.location.href.indexOf("#"));
		}
		if (url != window.location.href) {
			window.location.href = url;
			return true;
		}
		return false;
	};

	self.go_home = function() {
		if (lastopen) {
			self.change("session", lastopen);
		}
		else {
			self.change("session");
		}
	};

	window.onhashchange = self.detect_url_change;

	return self;
}());
