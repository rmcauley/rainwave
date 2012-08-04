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

function linkify(el, external, new_window) {
	if (new_window) el.setAttribute("class", el.getAttribute("class") + " new_window");
	else if (external) el.setAttribute("class", el.getAttribute("class") + " external_link");
	else if (el.getAttribute("class")) el.setAttribute("class", el.getAttribute("class") + " link");
	else el.setAttribute("class", "link");
	return el;
}

function formatTime(seconds) {
	var minutes = Math.floor(seconds / 60);
	var secs = seconds - (minutes * 60);
	if (secs < 10) secs = "0" + secs;
	return minutes + ":" + secs;
}

// TODO: Remove usage of this function
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

// VERY rough, based on: http://www.gubatron.com/blog/2010/01/16/javascript-get-how-many-digits-are-there-in-a-decimal-number/
// It is, however, far less painful than using measureText as above.
function measureNumber(number) {
	 return (UISCALE * 0.7) * (1 + Math.floor(Math.log(number)/Math.log(10)));
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
	"o": new RegExp("[òóôõöø]", 'g'),
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
