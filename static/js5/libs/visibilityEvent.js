var visibilityEventNames = {};
if (typeof document.hidden !== "undefined") {
	visibilityEventNames.hidden = "hidden";
	visibilityEventNames.change = "visibilitychange";
} else if (typeof document.mozHidden !== "undefined") {
	visibilityEventNames.hidden = "mozHidden";
	visibilityEventNames.hange = "mozvisibilitychange";
} else if (typeof document.msHidden !== "undefined") {
	visibilityEventNames.hidden = "msHidden";
	visibilityEventNames.visibilityChange = "msvisibilitychange";
} else if (typeof document.webkitHidden !== "undefined") {
	visibilityEventNames.hidden = "webkitHidden";
	visibilityEventNames.visibilityChange = "webkitvisibilitychange";
}
