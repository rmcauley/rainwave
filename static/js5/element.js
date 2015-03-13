// Pass an array as attribs to use them as sub_elements
// Use a string in sub_elements to add a <span> with the string
// Pass an object to add attributes to the element
// If attribs is a string it'll just add textContent
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

function $id(id) {
	"use strict";
	return document.getElementById(id);
}

function $measure_el(el) {
	"use strict";
	var boxed = false;
	if (!el.parentNode) {
		$id("measure_box").appendChild(el);
		boxed = true;
	}
	var x = el.offsetWidth;
	var y = el.scrollHeight || el.offsetHeight;
	if (boxed) {
		$id("measure_box").removeChild(el);
	}
	return { "width": x, "height": y };
}

function $add_class(el, class_name) {
	"use strict";
	// best to use className here - getAttribute will return null if empty, className returns an empty string
	var classes = el.className.split(" ");
	if (classes.indexOf(class_name) == -1) {
		el.className = el.className + " " + class_name;
		return true;
	}
	return false;
}

function $remove_class(el, class_name) {
	"use strict";
	var classes = el.className.split(" ");
	if (classes.indexOf(class_name) != -1) {
		classes.splice(classes.indexOf(class_name), 1);
		el.className = classes.join(" ");
		return true;
	}
	return false;
}

function $has_class(el, class_name) {
	"use strict";
	if (!el.className) return false;
	if (el.className.split(" ").indexOf(class_name) == -1) {
		return false;
	}
	return true;
}


function $svg_icon(icon, cls) {
	"use strict";
	var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
	use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "/dj/static/images/rtm_symbols.svg#" + icon);
	if (cls) {
		svg.setAttributeNS(null, "class", cls);
	}
	svg.appendChild(use);
	return svg;
}