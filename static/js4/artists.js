var Artists = function() {
	"use strict";

	var self = {};

	self.append_spans_from_json = function(el, json) {
		for (var i = 0; i < json.length; i++) {
			el.appendChild($el("span", json[i].name));
		}
	};

	self.append_spans_from_string = function(el, string) {
		// TODO
	};

	return self;
}();