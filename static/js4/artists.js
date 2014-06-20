var Artists = function() {
	"use strict";

	var self = {};

	self.append_spans_from_json = function(el, json) {
		for (var i = 0; i < json.length; i++) {
			el.appendChild($el("span", json[i].name));
			if (i != json.length - 1) el.appendChild($el("span", { "textContent": ", " }));
		}
		return el;
	};

	return self;
}();