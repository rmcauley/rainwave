var Artists = function() {
	"use strict";

	var self = {};

	self.append_spans_from_json = function(el, json) {
		for (var i = 0; i < json.length; i++) {
			el.appendChild($el("span", json[i].name));
		}
		return el;
	};

	self.append_spans_from_string = function(el, string) {
		var artists = string.split(",");
		var artist;
		var json = [];
		for (var i = 0; i < artists.length; i++) {
			artist = artists[i].split("|");
			json.push({ "name": artist[0], "id": parseInt(artist[1]) });
		}
		return self.append_spans_from_json(el, json);
	};

	return self;
}();