var AlbumView = function(view, json) {
	"use strict";
	view.el.appendChild($el("div", { "textContent": json.name }));
	return view.el;
};