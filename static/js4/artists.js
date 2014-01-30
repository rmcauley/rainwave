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

	self.append_spans_from_string = function(el, string) {
		if (!string) return $el("span");
		var artists = string.split(",");
		var artist;
		var json = [];
		for (var i = 0; i < artists.length; i++) {
			artist = artists[i].split("|");
			json.push({ "name": artist[1], "id": parseInt(artist[0]) });
		}
		return self.append_spans_from_json(el, json);
	};

	return self;
}();