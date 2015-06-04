var Artists = function() {
	"use strict";

	var self = {};

	self.append_spans_from_json = function(el, json) {
		if (!json) return document.createElement("span");
		for (var i = 0; i < json.length; i++) {
			el.appendChild($el("a", { "textContent": json[i].name, "href": "#!/artist/" + json[i].id }));
			if (i != json.length - 1) el.appendChild($el("span", { "textContent": ", " }));
		}
		return el;
	};

	return self;
}();