let capable = typeof Notification !== "undefined" ? true : false;
let enabled = false;
let currentSongId;
let notifier;

function standardNotifier(song, artists, art) {
  return new Notification(song.title, {
    body: song.albums[0].name + "\n" + artists,
    tag: "current_song",
    icon: art,
  });
}

function windowsFirefoxNotifier(song, artists, art) {
  return new Notification($l("now_playing"), {
    body: song.title + "\n" + song.albums[0].name + "\n" + artists,
    tag: "current_song",
    icon: art,
  });
}

function linuxNotifier(song, artists) {
  return new Notification(song.title, {
    body: song.albums[0].name + "\n" + artists,
    tag: "current_song",
  });
}

function checkPermission() {
  if (!capable) return;
  if (!Prefs.get("notify")) return;
  if (enabled) return;

  Notification.requestPermission(function (status) {
    if (status === "granted") {
      enabled = true;
    } else {
      enabled = false;
    }
  });
}

function notify(schedCurrent) {
  if (!capable) return;
  if (!enabled) return;
  if (!Prefs.get("notify")) return;
  if (!schedCurrent || !schedCurrent.songs || schedCurrent.songs.length === 0)
    return;
  if (document.body.classList.contains("loading")) return;
  if (schedCurrent.songs[0].id == currentSongId) return;
  if (!document.body.classList.contains("tuned_in")) return;
  currentSongId = schedCurrent.songs[0].id;

  var art = schedCurrent.songs[0].albums[0].art
    ? schedCurrent.songs[0].albums[0].art + "_120.jpg"
    : "/static/images4/noart_1.jpg";
  var artists = "";
  for (var i = 0; i < schedCurrent.songs[0].artists.length; i++) {
    if (i > 0) artists += ", ";
    artists += schedCurrent.songs[0].artists[i].name;
  }
  try {
    var n = notifier(schedCurrent.songs[0], artists, art);
    n.onshow = function () {
      setTimeout(n.close.bind(n), 7000);
    };
  } catch (e) {
    capable = false;
    enabled = false;
  }
}

INIT_TASKS.on_init.push(function () {
  Prefs.define("notify", [false, true]);
  if (!capable) return;
  if (MOBILE) return;

  Prefs.add_callback("notify", checkPermission);
  checkPermission();
  API.add_callback("sched_current", notify);

  var ua = navigator.userAgent.toLowerCase();
  if (ua.indexOf("linux") >= 0) {
    notifier = linuxNotifier;
  } else if (ua.indexOf("windows") >= 0 && ua.indexOf("gecko") >= 0) {
    notifier = windowsFirefoxNotifier;
  } else {
    notifier = standardNotifier;
  }
});

export { capable, enabled, checkPermission, notify };
