var Albums = function() {
	var self = {};

	self.art_html = function(json, size) {
		if (!size) size = 120;
		var c = $el("div", { "class": "art_container" });
		if (!json.art) {
			c.appendChild($el("img", { "class": "art", "src": "/static/images4/noart_1.jpg" }));
		}
		else {
			c.appendChild($el("img", { "class": "art", "src": json.art + "_" + size + ".jpg" }));
		}
		return c;
	};

	return self;
}();