var $ = document.getElementById;

function createEl(type, attribs, appendto) {
	var el = document.createElement(type);
	if ((typeof(attribs) == "object") || (typeof(attribs) == "array")) {
		for (var i in attribs) {
			if (i == "textContent") el.textContent = attribs[i];
			else el.setAttribute(i.replace(/_/g, "-"), attribs[i]);
		}
	}
	if (appendto) appendto.appendChild(el);
	return el;
}

function formatHumanTime(seconds, fulltime, disableseconds) {
	if (seconds <= 0) return "-";
	var humantime = "";
	var stophere = false;
	if (seconds >= 604800) { humantime += Math.floor(seconds / 604800) + "w "; seconds = seconds % 604800; stophere = true; }
	if ((!stophere || fulltime) && (seconds >= 86400)) { humantime += Math.floor(seconds / 86400) + lang["timeformat_d"]; seconds = seconds % 86400; stophere = true; }
	if ((!stophere || fulltime) && (seconds >= 3600)) { humantime += Math.floor(seconds / 3600) + lang["timeformat_h"]; seconds = seconds %   3600; stophere = true; }
	if ((!stophere || fulltime) && (seconds >= 60)) { humantime += Math.floor(seconds / 60) + lang["timeformat_m"]; seconds = seconds % 60;   stophere = true; }
	if ((!stophere || fulltime) && (!disableseconds && (seconds < 60))) { humantime += seconds + lang["timeformat_s"]; }
	return humantime.substr(0, humantime.length - 1);
}

function linkify(el, link2) {
/*	if (svg.isElSVG(el)) {
		if (link2) svg.linkify(el);
		else el.style.cursor = "pointer";
	}
	else {*/
		//el.style.cursor = "pointer";
		if (link2) el.setAttribute("class", el.getAttribute("class") + " link2");
		else el.setAttribute("class", el.getAttribute("class") + " link");
	//}
}

function formatTime(seconds) {
	var minutes = Math.floor(seconds / 60);
	var secs = seconds - (minutes * 60);
	if (secs < 10) secs = "0" + secs;
	return minutes + ":" + secs;
}

// we'll want these for the fitText functions
var fittextdiv = document.createElement("div");
fittextdiv.setAttribute("id", "fittextdiv");

// returns true if changed, false if not.  textel is a reference and will be changed if necessary.
// expects <text> filled with <tspans> and no internal text at all (only tspans!)
function fitTSpans(textel, maxwidth, chop, style) {
	if (typeof(style) == "undefined") style = "";
	var toreturn = false;
	var tspans = textel.getElementsByTagName("tspan");
	var maxi = 0;
	fittextdiv.textContent = "";
	for (var i = 0; i < tspans.length; i++) {
		var prevwidth = fittextdiv.offsetWidth;
		fittextdiv.textContent += tspans[i].textContent;
		maxi = i;
		if (fittextdiv.offsetWidth > maxwidth) {
			toreturn = true;
			if ((i > 0) && chop) break;
			tspans[i].textContent = fitText(tspans[i].textContent, (maxwidth - prevwidth), style);
			break;
		}
	}
	for (var i = (tspans.length - 1); i > maxi; i--) {
		toreturn = true;
		textel.removeChild(tspans[i]);
	}
	return toreturn;
}

function fitText(text, maxwidth, style) {
	if (maxwidth < (UISCALE * 2)) return "...";
	if (style) fittextdiv.setAttribute("style", style);
	fittextdiv.textContent = text;
	// prime the ellipsis if necessary
	if (fittextdiv.offsetWidth > maxwidth) {
		fittextdiv.textContent += "...";
		var lastwidth = fittextdiv.offsetWidth;
		while (fittextdiv.offsetWidth > maxwidth) {
			// we do length - 4 so we can always keep the ellpisis intact at the end, and included in the measurements
			fittextdiv.textContent = fittextdiv.textContent.substring(0, (fittextdiv.textContent.length - 4)) + "...";
			if (fittextdiv.offsetWidth == lastwidth) break;
			lastwidth = fittextdiv.offsetWidth;
		}
	}
	return fittextdiv.textContent;
}

function measureText(text, style) {
	if (typeof(style) == "undefined") style = "";
	var textdiv = document.createElement("div");
	var body = document.getElementById("body");
	textdiv.setAttribute("style", "position: absolute; left: -1000px; display: inline; " + style);
	body.appendChild(textdiv);
	var textnode = document.createTextNode(text);
	textdiv.appendChild(textnode);
	var textwidth = textdiv.offsetWidth;
	body.removeChild(textdiv);
	return textwidth;
}

function formatNumberToMSS(seconds) {
	var minutes = Math.floor(seconds / 60);
	var newseconds = seconds - (minutes * 60);
	if (newseconds < 10) newseconds = "0" + newseconds;
	return (minutes + ":" + newseconds);
}

var _ACCENTS = {
	"a": new RegExp("[àáâãäå]", 'g'),
	"ae": new RegExp("æ", 'g'),
	"c": new RegExp("ç", 'g'),
	"e": new RegExp("[èéêë]", 'g'),
	"i": new RegExp("[ìíîï]", 'g'),
	"n": new RegExp("ñ", 'g'),
	"o": new RegExp("[òóôõö]", 'g'),
	"oe": new RegExp("œ", 'g'),
	"u": new RegExp("[ùúûü]", 'g'),
	"y": new RegExp("[ýÿ]", 'g')
}

function removeAccentsAndLC(s){
	var r = s.toLowerCase();
	for (var i in _ACCENTS) {
		r = r.replace(_ACCENTS[i], i);
	}
	return r;
};
