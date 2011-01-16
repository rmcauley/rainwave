function SVGHelper(workel) {
	var that = {};
	that.em = 0;
	that.capable = false;
	
	that.measureEm = function() {
		var emm = document.createElement('span');
		emm.setAttribute("style", "position: absolute; left: -400px");
		emm.textContent = "M";
		workel.appendChild(emm);
		that.em = emm.offsetWidth;
		workel.removeChild(emm);
	};
	
	that.measureEm();
	
	if (!document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1")) {
		return that;
	}
	that.capable = true;
	
	var ns = "http://www.w3.org/2000/svg";
	var xlinkns = "http://www.w3.org/1999/xlink";
	var xmlns = "http://www.w3.org/2000/xmlns/";
	
	var webkit = false;
	if (RegExp(" AppleWebKit/").test(navigator.userAgent)) webkit = true;
	else if (RegExp(" Chrome/").test(navigator.userAgent)) webkit = true;
	else if (RegExp(" Safari/").test(navigator.userAgent)) webkit = true;
	
	var linkcount = 0;
	
	that.setAttribs = function(el, attribs) {
		if ((typeof(attribs) == "object") || (typeof(attribs) == "array")) {
			for (var i in attribs) {
				if (webkit && (i == "shape_rendering")) continue;
				else if (i == "textContent") el.textContent = attribs[i];
				else el.setAttribute(i.replace(/_/g, "-"), attribs[i]);
			}
		}
	};
	
	that.make = function(attribs) {
		var newsvg = document.createElementNS(ns, "svg");
		newsvg.setAttributeNS(xmlns, "xmlns:xlink", xlinkns);
		that.setAttribs(newsvg, attribs);
		return newsvg;
	};
	
	that.makeEl = function(type, attribs) {
		var newel = document.createElementNS(ns, type);
		if (attribs) that.setAttribs(newel, attribs);
		return newel;
	};
	
	that.makeLine = function(x1, y1, x2, y2, attribs) {
		var newel = that.makeEl("line");
		newel.setAttribute("x1", x1);
		newel.setAttribute("y1", y1);
		newel.setAttribute("x2", x2);
		newel.setAttribute("y2", y2);
		that.setAttribs(newel, attribs);
		return newel;
	};
	
	that.makeRect = function(x, y, width, height, attribs) {
		var newel = that.makeEl("rect");
		newel.setAttribute("x", x);
		newel.setAttribute("y", y);
		newel.setAttribute("width", width);
		newel.setAttribute("height", height);
		that.setAttribs(newel, attribs);
		return newel;
	};
	
	that.makeImage = function(href, x, y, width, height, attribs) {
		var newel = that.makeEl("image");
		newel.setAttribute("x", x);
		newel.setAttribute("y", y);
		newel.setAttribute("width", width);
		newel.setAttribute("height", height);
		newel.setAttribute("fill", "none");
		newel.setAttributeNS(xlinkns, "xlink:href", href);
		that.setAttribs(newel, attribs);
		return newel;
	};
	
	that.makeGradient = function(type, id,x1, y1, x2, y2, spreadmethod) {
		var newel = that.makeEl(type + "Gradient");
		newel.setAttribute("id", id);
		newel.setAttribute("x1", x1);
		newel.setAttribute("y1", y1);
		newel.setAttribute("x2", x2);
		newel.setAttribute("y2", y2);
		newel.setAttribute("spreadmethod", spreadmethod);
		return newel;
	};
	
	that.makeStop = function(offset, color, opacity) {
		var newel = that.makeEl("stop");
		newel.setAttribute("offset", offset);
		newel.setAttribute("stop-color", color);
		newel.setAttribute("stop-opacity", opacity);
		return newel;
	};
	
	that.linkify = function(el, href, samewindow, textcolor) {
		linkcount++;
		el.style.cursor = "pointer";
		if (href) {
			if (samewindow) el.addEventListener("click", function() { location.href = href }, true);
			else el.addEventListener("click", function() { window.open(href, "rw_link_" + linkcount, ''); }, true);
		}
	};
	
	that.linkifyText = that.linkify;
	
	that.isElSVG = function(el) {
		if (el.namespaceURI.indexOf("svg") > 0) return true
		return false;
	};
	
	return that;
}