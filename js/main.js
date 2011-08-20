var SCHED_ELEC = 0;
var SCHED_ADSET = 1;
var SCHED_JINGLE = 2;
var SCHED_LIVE = 3;
var SCHED_ONESHOT = 4;
var SCHED_PLAYLIST = 5;
var SCHED_PAUSE = 6;
var SCHED_DJ = 7;

var STATIONS = [ false, "Rainwave", "OCR Radio", "Mixwave", "Bitwave", "Omniwave" ];
var SHORTSTATIONS = [ false, "RW", "OC", "MW", "Bit", "Omni" ];
var CANONSTATIONS = [ false, "rw", "oc", "mw", "bit", "omni" ];
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
	
	prefs.addPref("help", { "name": "visited", "defaultvalue": false, "hidden": true });
	
	for (var i in panels) {
		panelcname[panels[i].cname] = i;
	}
	
	if (!prefs.getPref("help", "visited") && !SIDEBAR) {
		prefs.changePref("help", "visited", true);
		prefs.savePrefs();
		help.startTutorial("welcome");
	}
}

function deepLink(pageargs) {
	// this tells edi to change the URL
	pageargs.unshift(true);
	edi.openPanelLink.apply(this, pageargs);
	lyre.removeCallback("sched_sync", deeplinkcallbackid);
}

window.addEventListener('load', init, true);
