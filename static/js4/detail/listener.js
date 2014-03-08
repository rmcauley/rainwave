var ListenerView = function(view, json) {
	"use strict";
	var d = $el("div", { "class": "albumview_header" });
	d.appendChild($el("h1", { "textContent": json.name }));
	view.el.appendChild(d);
	return view.el;
};