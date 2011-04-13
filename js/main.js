var SCHED_ELEC = 0;
var SCHED_ADSET = 1;
var SCHED_JINGLE = 2;
var SCHED_LIVE = 3;
var SCHED_ONESHOT = 4;
var SCHED_PLAYLIST = 5;
var SCHED_PAUSE = 6;
var SCHED_DJ = 7;

var STATIONS = [ false, "Rainwave", "OCR Radio", "Mixwave" ];
var SHORTSTATIONS = [ false, "RW", "OC", "MW" ];
var UISCALE = 10;
var BODY = document.getElementById("body");

var SIDEBAR = false;
if (location.href.indexOf("sidebar=true") > 0) SIDEBAR = true;

var panels = { "false": false };
var mouse = { "x": 0, "y": 0 };
var initpiggyback = {};
var theme = _THEME();

function init() {
	prefs.addPref("edi", { name: "language", defaultvalue: "en_CA", type: "dropdown", options: [
			{ "value": "de_DE", "option": "Deutsch" },
			{ "value": "en_CA", "option": "English (Canada)" },
			{ "value": "es_CL", "option": "Español (Chile)" },
			{ "value": "fr_CA", "option": "Français (Canada)" },
			{ "value": "nl_NL", "option": "Nederlands" },
			{ "value": "pt_BR", "option": "Português (Brasil)" },
			{ "value": "fi_FI", "option": "Suomi" },
			{ "value": "se_SE", "option": "Svenska" }
		], refresh: true });
	prefs.addPref("edi", { hidden: true, name: "theme", defaultvalue: "RWClassic", type: "dropdown", options: [ { value: "RWClassic", option: "Rainwave 3" } ], refresh: true });
	
	if (document.location.href.indexOf("beta") == -1) {
		lyre.catcherrors = true;
		lyre.jsErrorCallback = errorcontrol.jsError;
	}
	lyre.setStationID(PRELOADED_SID);
	lyre.setUserID(PRELOADED_USER_ID);
	lyre.setKey(PRELOADED_APIKEY);
	lyre.errorCallback = errorcontrol.doError;

	errorcontrol.setupCallbacks();
	edi.init(BODY);

	lyre.sync_start(initpiggyback);
	
	prefs.addPref("help", { "name": "visited", "defaultvalue": false, "hidden": true });
	
	if (!prefs.getPref("help", "visited") && !SIDEBAR) {
		help.startTutorial("welcome");
		prefs.changePref("help", "visited", true);
		prefs.savePrefs();
	}
}

window.addEventListener('load', init, true);