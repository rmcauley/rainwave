var SCHED_ELEC = 0;
var SCHED_ADSET = 1;
var SCHED_JINGLE = 2;
var SCHED_LIVE = 3;
var SCHED_ONESHOT = 4;
var SCHED_PLAYLIST = 5;
var SCHED_PAUSE = 6;
var SCHED_DJ = 7;

var STATIONS = [ false, "Game", "OverClocked ReMix", "Covers", "Chiptunes", "All" ];
var SHORTSTATIONS = [ false, "Game", "OCR", "Covers", "Chip", "All" ];
var CANONSTATIONS = [ false, "game", "ocr", "cover", "chip", "all" ];
var ELECSONGTYPES = { "conflict": 0, "warn": 1, "normal": 2, "queue": 3, "request": 4 };
var UISCALE = 10;
var BODY = document.getElementById("body");

var SIDEBAR = false;
if (location.href.indexOf("sidebar=true") > 0) SIDEBAR = true;

var panels = { "false": false };
var mouse = { "x": 0, "y": 0 };
var initpiggyback = {};
var theme = _THEME();
var panelcname = {};
var deeplinkcallbackid = false;

function init() {
	var browserfailed = false;
	if (/MSIE (6|7|8)/i.test(navigator.userAgent)) browserfailed = true;
	else if (!JSON) browserfailed = true;
	else if (!XMLHttpRequest) browserfailed = true;
	
	if (browserfailed) {
		createEl("p", false, BODY).innerHTML = "Sorry, your browser is too old to use Rainwave.  Please upgrade to <a href='http://getfirefox.com' class='external_link' style='color: #AAFFFF;'>Firefox</a> or <a href='http://google.com/chrome' class='external_link' style='color: #AAFFFF;'>Chrome</a>.";
		createEl("p", false, BODY).innerHTML = "If you don't, or can't, you can still tune in to Rainwave using a media player with the following links:";
		var ul = createEl("ul", false, BODY);
		var li = createEl("li", false, ul);
		createEl("a", { "style": "color: #AAFFFF;", "class": "external_link", "textContent": "All Station Mix", "href": "http://rainwave.cc/tunein.php?site=omni" }, li);
		li = createEl("li", false, ul);
		createEl("a", { "style": "color: #AAFFFF;", "class": "external_link", "textContent": "Game Only", "href": "http://rainwave.cc/tunein.php?site=rw" }, li);
		li = createEl("li", false, ul);
		createEl("a", { "style": "color: #AAFFFF;", "class": "external_link", "textContent": "Chiptune Only", "href": "http://rainwave.cc/tunein.php?site=bit" }, li);
		li = createEl("li", false, ul);
		createEl("a", { "style": "color: #AAFFFF;", "class": "external_link", "textContent": "Covers Only", "href": "http://rainwave.cc/tunein.php?site=mw" }, li);		
		li = createEl("li", false, ul);
		createEl("a", { "style": "color: #AAFFFF;", "class": "external_link", "textContent": "OverClocked ReMix", "href": "http://rainwave.cc/tunein.php?site=oc" }, li);
		return false;
	}

	prefs.addPref("edi", { name: "language", defaultvalue: PRELOADED_LANG, type: "dropdown", options: [
			{ "value": "de_DE", "option": "Deutsch" },
			{ "value": "en_CA", "option": "English (Canada)" },
			{ "value": "es_CL", "option": "Español (Chile)" },
			{ "value": "fr_CA", "option": "Français (Canada)" },
			{ "value": "nl_NL", "option": "Nederlands" },
			{ "value": "pt_BR", "option": "Português (Brasil)" },
			{ "value": "fi_FI", "option": "Suomi" },
			{ "value": "se_SE", "option": "Svenska" }
		], refresh: true });
	prefs.addPref("edi", { hidden: true, name: "theme", defaultvalue: "RWClassic", type: "dropdown", options: [ { value: "Rainwave", option: "Rainwave 3" } ], refresh: true });
	prefs.addPref("help", { "name": "visited", "defaultvalue": false, "hidden": true });
	
	var deeplinkurl = decodeURI(location.href);
	if (deeplinkurl.indexOf("#!/") >= 0) {
		var pageargs = deeplinkurl.substring(deeplinkurl.indexOf("#!/") + 3).split("/");
		var new_sid = CANONSTATIONS.indexOf(pageargs[0]);
		pageargs = pageargs.slice(1);
		if (new_sid) {
			PRELOADED_SID = new_sid;
			deeplinkcallbackid = lyre.addCallback(function() { deepLink(pageargs); }, "sched_sync");
		}
	}
	
	lyre.catcherrors = true;
	lyre.jsErrorCallback = errorcontrol.jsError;
	lyre.setStationID(PRELOADED_SID);
	lyre.setUserID(PRELOADED_USER_ID);
	lyre.setKey(PRELOADED_APIKEY);
	if (typeof(PRELOADED_LYREURL) != "undefined") lyre.setURLPrefix(PRELOADED_LYREURL);
	lyre.errorCallback = errorcontrol.doError;

	errorcontrol.setupCallbacks();
	edi.init(BODY);

	lyre.sync_start(initpiggyback);
	
	for (var i in panels) {
		panelcname[panels[i].cname] = i;
	}
	
	if (!prefs.getPref("help", "visited") && !SIDEBAR) {
		prefs.changePref("help", "visited", true);
		prefs.savePrefs();
		help.startTutorial("welcome");
	}
	
	prefs.addPref("edi", { "name": "autoplay", "defaultvalue": false, "type": "checkbox" });
	if (prefs.getPref("edi", "autoplay")) {
		edi.openpanels["MenuPanel"].playerClick();
	}
}

function deepLink(pageargs) {
	// this tells edi to change the URL
	pageargs.unshift(true);
	edi.openPanelLink.apply(this, pageargs);
	lyre.removeCallback("sched_sync", deeplinkcallbackid);
}

window.addEventListener('load', init, true);
