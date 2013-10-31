'use strict';

// Pass an array as attribs to use them as sub_elements
// Use a string in sub_elements to add a <span> with the string
// Pass an object to add attributes to the element
// If attribs is a string it'll just add textContent
function $el(type, attribs, sub_elements) {
	var el = document.createElement(type);
	var i;
	if (Array.isArray(attribs)) {
		sub_elements = attribs;
		attribs = null;
	}
	if (sub_elements) {
		for (i = 0; i < attribs.length; i++) {
			if (typeof(attribs[i]) == "string") {
				var el2 = document.createElement("span");
				el2.textContent = attribs[i];
				el.appendChild(el2);
			}
			else {
				el.appendChild(attribs[i]);
			}
		}
	}
	if (typeof(attribs) == "string") {
		el.textContent = attribs;
	}
	else if (attribs) {
		for (i in attribs) {
			if (i == "textContent") el.textContent = attribs[i];
			else el.setAttribute(i.replace(/_/g, "-"), attribs[i]);
		}
	}
	return el;
}


$id = document.getElementById;
