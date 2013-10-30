'use strict';

function $el(type, attribs) {
	var el = document.createElement(type);
	for (var i in attribs) {
		if (i == "textContent") el.textContent = attribs[i];
		else el.setAttribute(i.replace(/_/g, "-"), attribs[i]);
	}
	return el;
}
