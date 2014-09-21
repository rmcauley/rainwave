var Groups = function() {
	"use strict";

	var self = {};

	var open_from_target = function(e) {
		if (e.target._group_id) DetailView.open_group(e.target._group_id);
	}

	self.append_spans_from_json = function(el, json) {
		var a;
		for (var i = 0; i < json.length; i++) {
			a = $el("span", { "textContent": json[i].name, "class": "link" });
			a._group_id = parseInt(json[i].id);
			a.addEventListener("click", open_from_target);
			el.appendChild(a);
			if (i != json.length - 1) el.appendChild($el("span", { "textContent": ", " }));
		}
		return el;
	};

	return self;
}();