function $el(type, attribs, sub_elements) {
	"use strict";
	var el = document.createElement(type);
	var i;
	if (Array.isArray(attribs)) {
		sub_elements = attribs;
		attribs = null;
	}
	if (sub_elements) {
		for (i = 0; i < sub_elements.length; i++) {
			if (typeof(sub_elements[i]) == "string") {
				var el2 = document.createElement("span");
				el2.textContent = sub_elements[i];
				el.appendChild(el2);
			}
			else {
				el.appendChild(sub_elements[i]);
			}
		}
	}
	if (typeof(attribs) == "string") {
		el.textContent = attribs;
	}
	else if (attribs) {
		for (i in attribs) {
			if (i == "textContent") {
				el.textContent = attribs[i];
			}
			else {
				el.setAttribute(i.replace(/_/g, "-"), attribs[i]);
			}
		}
	}
	return el;
}