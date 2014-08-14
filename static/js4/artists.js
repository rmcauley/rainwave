var Artists = function() {
	"use strict";

	var self = {};

	var open_artist_from_target = function(e) {
		if (e.target._artist_id) DetailView.open_artist(e.target._artist_id);
	}

	self.append_spans_from_json = function(el, json) {
		var a;
		for (var i = 0; i < json.length; i++) {
			a = $el("span", { "textContent": json[i].name, "class": "link" });
			a._artist_id = parseInt(json[i].id);
			a.addEventListener("click", open_artist_from_target);
			el.appendChild(a);
			if (i != json.length - 1) el.appendChild($el("span", { "textContent": ", " }));
		}
		return el;
	};

	return self;
}();