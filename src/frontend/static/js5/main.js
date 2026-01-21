/* For page initialization:

INIT_TASKS.on_init will fill a documentFragment
INIT_TASKS.on_measure happens after a paint - use this to measure elements without incurring extra reflows
INIT_TASKS.on_draw happens after the measurement - please do not cause reflows.

*/

var User;
var Stations = [];
var API;
var RWAudio;
var rainwaveInitialized = false;
var LOCALE = 'en_CA';
var lang;
var INIT_TASKS = { 
  "on_init": [],
  "on_measure": [],
  "on_draw": [],
};
var MOBILE = navigator.userAgent.toLowerCase().includes("mobile") || navigator.userAgent.toLowerCase().includes("android");
var Prefs;

function rainwaveInit() {
  "use strict";

  if (!document.body) {
    document.addEventListener("load", rainwaveInit);
    return;
  }
  if (rainwaveInitialized || !window.BOOTSTRAP || !window.ALL_LANG || !window.RWTemplates) {
    return;
  }

  rainwaveInitialized = true;

  Prefs = PrefsInit(BOOTSTRAP.locales, BOOTSTRAP.cookie_domain);
  
  var potentialLang = (docCookies.getItem("rw_lang") || navigator.language).replace("-", "_");
  Object.entries(ALL_LANG).forEach(function (entry) {
    if (entry[0].toLowerCase() == potentialLang.toLowerCase()) {
      LOCALE = entry[0];
      lang = entry[1];
    }
  })
  if (!lang) {
    Object.entries(ALL_LANG).forEach(function (entry) {
      if (entry[0].slice(0, 2).toLowerCase() == potentialLang.slice(0, 2).toLowerCase()) {
        LOCALE = entry[0];
        lang = entry[1];
      }
    });
  }
  if (!lang) {
    lang = ALL_LANG[LOCALE];
  }

  User = BOOTSTRAP.user;

  var template;

  // this global API variable name and the function renaming
  // was required after the API changed to something useable
  // by the outside world.
  API = RainwaveAPI;
  API.exceptionHandler = ErrorHandler.onerror_handler;
  API.onError = ErrorHandler.permanent_error;
  API.onErrorRemove = ErrorHandler.remove_permanent_error;
  API.onUnsuccessful = ErrorHandler.tooltip_error;
  API.onRequestError = ErrorHandler.tooltip_error;
  API.add_callback = API.addEventListener;
  API.async_get = API.request;
  API.force_sync = API.forceReconnect;
  API.sync_stop = API.closePermanently;
  API.on("wsthrottle", function (json) {
    API.onUnsuccessful(json);
  });
  API.on("wserror", function (json) {
    if (json.tl_key === "auth_failed") {
      var template = Modal(
        $l("auth_required"),
        "modal_auth_failure",
        {},
        true
      );
      if (!template) return;
      template._root.parentNode.classList.add("error");
    }
  });
  // for local development and debugging
  if (window.location.hostname === "localhost") {
    API.forceSecure = false;
  }

  RWAudio = RWAudioConstructor();

  Prefs.define("pwr");
  if (Prefs.get("pwr")) {
    Sizing.simple = false;
  }

  Prefs.define("roboto", [true, false]);
  Prefs.define("f_norm", [true, false], true);
  Prefs.add_callback("roboto", function (nv) {
    if (!nv) {
      document.body.classList.add("nofont");
    } else {
      document.body.classList.remove("nofont");
    }
  });
  Prefs.add_callback("f_norm", function (nv) {
    if (!nv) {
      document.body.classList.add("nofontsize");
    } else {
      document.body.classList.remove("nofontsize");
    }
  });

  // BOOTSTRAP.station_list = {
  // 	1: { "id": 1, "name": "Game", "url": "hello" },
  // 	2: { "id": 2, "name": "OC ReMix", "url": "hello" },
  // 	3: { "id": 3, "name": "Covers", "url": "hello" },
  // 	4: { "id": 4, "name": "Chiptune", "url": "hello" },
  // 	5: { "id": 5, "name": "All", "url": "hello" }
  // };
  // BOOTSTRAP.all_stations_info = {
  // 	1: { "album": "Game Test Album", "event_name": null, "art": "/static/baked/art/1_155", "event_type": "Election", "title": "Game Test Song" },
  // 	2: { "album": "OCR Test Album", "event_name": null, "art": "/static/baked/art/1_155", "event_type": "Election", "title": "OCR Test Song" },
  // 	3: { "album": "Covers Test Album", "event_name": null, "art": "/static/baked/art/1_155", "event_type": "Election", "title": "Covers Test Song" },
  // 	4: { "album": "Chip Test Album", "event_name": null, "art": "/static/baked/art/1_155", "event_type": "Election", "title": "Chip Test Song" },
  // 	5: { "album": "All Test Album", "event_name": null, "art": "/static/baked/art/1_155", "event_type": "Election", "title": "All Test Song" },
  // };

  var order = [5, 1, 4, 2, 3];
  var colors = {
    1: "#1f95e5", // Rainwave blue
    2: "#de641b", // OCR Orange
    3: "#b7000f", // Red
    4: "#6e439d", // Indigo
    5: "#a8cb2b", // greenish
  };
  for (var i = 0; i < order.length; i++) {
    if (BOOTSTRAP.station_list[order[i]]) {
      Stations.push(BOOTSTRAP.station_list[order[i]]);
      Stations[Stations.length - 1].name = $l("station_name_" + order[i]);
      var stationUrl = new URL(Stations[Stations.length - 1].url);
      if (order[i] == BOOTSTRAP.user.sid) {
        if (window.location.pathname == '/' && window.location.hostname == stationUrl.hostname) {
          window.history.replaceState(null, "", stationUrl.pathname + window.location.search);
        }
        Stations[Stations.length - 1].url = null;
      }
      if (colors[order[i]]) {
        Stations[Stations.length - 1].color = colors[order[i]];
      }
    }
  }

  if (window.location.href.indexOf("beta") !== -1) {
    for (i = 0; i < Stations.length; i++) {
      if (Stations[i].url) Stations[i].url = "/beta/?sid=" + Stations[i].id;
    }
  }
  BOOTSTRAP.station_list = Stations;

  template = RWTemplates.index({ stations: Stations });

  API.add_callback("user", function (json) {
    if (json.dj) {
      document.body.classList.add("is_dj");
    } else {
      document.body.classList.remove("is_dj");
    }
    User = json;
  });

  // pre-paint DOM operations while the network is doing its work for CSS
  for (i = 0; i < INIT_TASKS.on_init.length; i++) {
    INIT_TASKS.on_init[i](template);
  }
  // };

  // var draw = function() {
  // 	var i;
  if (User.id > 1) {
    document.body.classList.add("logged_in");
  }
  if (Prefs.get("pwr")) {
    document.body.classList.add("full");
    document.body.classList.remove("simple");
  }
  if (!Prefs.get("roboto")) {
    document.body.classList.add("nofont");
  }
  if (!Prefs.get("f_norm")) {
    document.body.classList.add("nofontsize");
  }
  if (Prefs.get("l_displose")) {
    document.body.classList.add("displose");
  }

  // Safari has CSS and font rendering issues :/
  var ua = navigator.userAgent.toLowerCase();
  if (ua.indexOf("safari") !== -1 && ua.indexOf("chrome") === -1) {
    document.body.classList.add("safari");
  }

  document.body.appendChild(template._root);

  for (i = 0; i < INIT_TASKS.on_measure.length; i++) {
    INIT_TASKS.on_measure[i](template);
  }

  for (i = 0; i < INIT_TASKS.on_draw.length; i++) {
    INIT_TASKS.on_draw[i](template);
  }

  Sizing.trigger_resize();

  API.initialize(
    BOOTSTRAP.user.sid,
    BOOTSTRAP.user.id,
    BOOTSTRAP.user.api_key,
    BOOTSTRAP,
    BOOTSTRAP.websocket_host
  );

  Sizing.trigger_resize();

  if (!Router.detect_url_change()) {
    if (!Sizing.simple && docCookies.getItem("r5_list")) {
      Router.change(docCookies.getItem("r5_list"));
    } else if (Sizing.simple) {
      docCookies.removeItem("r5_list", "/", BOOTSTRAP.cookie_domain);
    }
  }

  document.body.classList.remove("loading");

  BOOTSTRAP = null;
}
