var SCHED_ELEC = 0;
var SCHED_ADSET = 1;
var SCHED_JINGLE = 2;
var SCHED_LIVE = 3;
var SCHED_ONESHOT = 4;
var SCHED_PLAYLIST = 5;
var SCHED_PAUSE = 6;
var SCHED_DJ = 7;

var STATIONS = [ false, "Rainwave", "OCR Radio", "Mixwave" ];

var errorcontrol = ErrorControl();
var ajax = false;
var edi = false;
var clock = false;
var titleupdate = false;
var user = false;
var ratingcontrol = false;
var log = false;
var theme = true;   // this global var only gets the actual theme obj from edi if it's assigned true (NOT a truthy value, *true*), so that Prefs can overwrite it
var fx = false;
var panels = new Array();
var hotkey = false;
var graph = false;
var prefs = Preferences(); // this must be loaded before any panels, so yes, it comes very early
var mouse = { "x": 0, "y": 0 };
var initpiggyback = {};
var svg = SVGHelper(document.getElementById("body"));
var help = Help();
var body = false;
var fittextdiv = false;

// stolen from quirksmode.org
function getMousePosX(e) {
	var posx = 0;
	if (!e) e = window.event;
	if (e.pageX) {
		posx = e.pageX;
	}
	else if (e.clientX) {
		posx = e.clientX + document.body.scrollLeft	+ document.documentElement.scrollLeft;
	}
	return posx;
}

// more stealing from quirksmode.org
function getMousePosY(e) {
	var posy = 0;
	if (!e) e = window.event;
	if (e.pageY) {
		posy = e.pageY;
	}
	else if (e.clientY) {
		posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
	}
	return posy;
}

function mouseUpdate(e) {
	mouse.x = getMousePosX(e);
	mouse.y = getMousePosY(e);
}
window.addEventListener('mousedown', mouseUpdate, true);

function drawAboutScreen(div) {
	var tbl = createEl("table", { "class": "about help_paragraph" });
	var html = "<tr><td>Rainwave Version:</td><td>r" + BUILDNUM + "</td></tr>";
	html += "<tr><td>" + _l("creator") + ":</td><td>LiquidRain</td></tr>";
	html += "<tr><td>" + _l("rainwavemanagers") + ":</td><td>Ten19, Vyzov, LiquidRain</td></tr>";
	html += "<tr><td>" + _l("ocrmanagers") + ":</td><td>William</td></tr>";
	html += "<tr><td>" + _l("mixwavemanagers") + ":</td><td>SOcean255</td></tr>";
	html += "<tr><td>" + _l("jfinalfunkjob") + ":</td><td>jfinalfunk</td></tr>";
	html += "<tr><td>" + _l("relayadmins") + ":</td><td>Lyfe, Tanaric, Dracoirs, Rilgon</td></tr>";
	html += "<tr><td style='padding-top: 1em;'>" + _l("specialthanks") + ":</td><td style='padding-top: 1em;'>strwrsxprt, heschi, Brayniac, Salty, efiloN, Steppo</td></tr>";
	html += "<tr><td style='padding-top: 1em;'>" + _l("poweredby") + ":</td><td style='padding-top: 1em;'>" + _l("customsoftware") + ", <a href='http://icecast.org' target='_blank' onclick='return false;'>Icecast<img src='images/new_window_icon.png' alt='(*)' /></a>, <a href='http://savonet.sourceforge.net' target='_blank' onclick='return false;'>Liquidsoap<img src='images/new_window_icon.png' alt='(*)' /></a></td></tr>";
	tbl.innerHTML = html;
	div.appendChild(tbl);
	var a1 = createEl("a", { "href": "donations.php", "textContent": _l("donationinformation"), "class": "help_paragraph", "style": "margin-top: 1em; display: block", "target": "_blank", "onclick": "return false;" });
	a1.appendChild(createEl("img", { "src": "images/new_window_icon.png", "alt": "->" }));
	div.appendChild(a1);
	var a2 = createEl("a", { "href": "/api", "textContent": _l("apiinformation"), "class": "help_paragraph", "style": "margin-top: 1em; display: block", "target": "_blank", "onclick": "return false;" });
	a2.appendChild(createEl("img", { "src": "images/new_window_icon.png", "alt": "->" }));
	div.appendChild(a2);
}

function init() {
	body = document.getElementById("body");
	body.appendChild(fittextdiv);
	ajax = LyreAJAX();
	ajax.setStationID(PRELOADED_SID);
	ajax.setUserID(PRELOADED_USER_ID);
	ajax.setKey(PRELOADED_APIKEY);
	
	errorcontrol.setupCallbacks();
	ajax.errorCallback = errorcontrol.doError;

	hotkey = HotkeyControl();
	fx = R3Effects();
	graph = R3Graph();
	edi = Edi(document.getElementById("body"));
	edi.panels = panels;
	log = edi.log;
	ajax.logobj = edi.log;
	
	clock = ClockControl();
	titleupdate = TitleUpdate();
	user = UserControl();
	ratingcontrol = RatingUpdateControl();
	
	help.addStep("about", { "h": "about", "pf": drawAboutScreen, "width": svg.em * 55, "height": svg.em * 30 });
	help.addTutorial("about", [ "about" ]);
	help.addTopic("about", { "h": "about", "p": "about_p", "tutorial": "about" });

	help.addTutorial("welcome", [ "tunein", "clickonsongtovote" ] );

	help.addTopic("playlistsearch", { "h": "playlistsearch", "p": "playlistsearch_p" });

	help.addStep("setfavourite", { "h": "setfavourite", "p": "setfavourite_p" });

	help.addStep("ratecurrentsong", { "h": "ratecurrentsong", "p": "ratecurrentsong_p", "height": svg.em * 15 });
	help.addStep("tunein", { "h": "tunein", "p": "tunein_p", "mody": 35, "skipf": function() { return user.p.radio_tunedin ? true : false; } } );
	help.addStep("login", { "h": "login", "p": "login_p", "skipf": function() { return user.p.user_id > 1 ? true : false } });
	help.addTutorial("ratecurrentsong", [ "register", "tunein", "ratecurrentsong", "setfavourite" ]);
	help.addTopic("ratecurrentsong", { "h": "ratecurrentsong", "p": "ratecurrentsong_t", "tutorial": "ratecurrentsong", "skipf": function() { return user.p.radio_tunedin ? true : false; } });

	help.addTopic("tunein", { "h": "tunein", "p": "tunein_p", "mody": 35, "modx": -350 });
	
	edi.init();
	if (graph) graph.init(); // must be done after the theme object is available
	
	errorcontrol.initTheme();
	if (!prefs.p.help || !prefs.p.help.visited.value) {
		edi.openPanelLink("HelpPanel", "");
	}
	ajax.sync_start(initpiggyback);
	
	if (!prefs || !prefs.p || !prefs.p.help || !prefs.p.help.visited || !prefs.p.help.visited.value) {
		help.startTutorial("welcome");
		prefs.changePref("help", "visited", true);
	}
	
	prefs.addPref("help", { name: "visited", defaultvalue: false, hidden: true });
}

window.addEventListener('load', init, true);