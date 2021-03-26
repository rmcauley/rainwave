var RWAudioConstructor = function () {
  "use strict";

  // this file uses RainwavePlayer which confirms to Javascript standards
  // unlike the rest of my codebase
  // furthermore it was all hacked in
  // so expect the worst in variable naming mixing

  var self = RainwavePlayer;
  self.debug = true;
  self.shuffleURLs = true;
  if (!self.isSupported) return;

  var el;
  var volume_el;
  var volume_rect;
  var volume_container;
  var mute_el;
  var offset_width = 54; // taken straight from the CSS for #audio_volume
  var offset_left;
  var last_user_tunein_check = 0;
  var now_playing;
  var iOSAppMode =
    window.webkit &&
    window.webkit.messageHandlers &&
    window.webkit.messageHandlers.rainwavePlay;

  if (iOSAppMode) {
    self.play = function () {
      window.webkit.messageHandlers.rainwavePlay.postMessage(User.sid);
    };

    self.stop = function () {
      window.webkit.messageHandlers.rainwaveStop.postMessage(User.sid);
    };

    self.useStreamURLs = function (streamURLs) {
      window.webkit.messageHandlers.rainwaveUseStreamURLs.postMessage(
        streamURLs
      );
    };
  }

  BOOTSTRAP.on_init.push(function (root_template) {
    self.audioElDest = root_template.measure_box;

    root_template.volume_container = document.getElementById(
      "audio_volume_container"
    );
    root_template.volume = document.getElementById("audio_volume");
    root_template.volume_indicator = document.getElementById(
      "audio_volume_indicator"
    );
    root_template.volume.style.display = "";
    root_template.mute.parentNode.appendChild(root_template.volume_container);

    root_template.volume.addEventListener(
      "mousedown",
      volume_control_mousedown
    );
    root_template.mute.addEventListener("click", self.toggleMute);
    root_template.play.addEventListener("click", self.playToggle);
    root_template.play2.addEventListener("click", self.play);
    root_template.stop.addEventListener("click", self.stop);

    el = root_template.player;
    volume_el = root_template.volume;
    volume_rect = root_template.volume_indicator;
    volume_container = root_template.volume_container;
    mute_el = root_template.mute;

    var stream_query = "";
    if (User && User.listen_key) {
      stream_query += "?" + User.id + ":" + User.listen_key;
    }
    self.useStation(BOOTSTRAP.user.sid, stream_query);

    API.add_callback("user", user_tunein_check);
    API.add_callback("sched_current", function (np) {
      now_playing = np;
      if (msUpdateMetadata) {
        msUpdateMetadata();
      }
    });

    Prefs.define("vol", [1.0]);
    draw_volume(Prefs.get("vol"));
  });

  var user_tunein_check = function (json) {
    if (json.tuned_in) {
      document.body.classList.add("tuned_in");
    } else {
      document.body.classList.remove("tuned_in");
    }
    if (!self.isPlaying) return;
    if (last_user_tunein_check < Clock.now - 300) {
      last_user_tunein_check = parseInt(Clock.now);
      if (!json.tuned_in) {
        ErrorHandler.remove_permanent_error("audio_connect_error_reattempting");
        ErrorHandler.remove_permanent_error("chrome_mobile_takes_time");
        self.stop();
        setTimeout(self.play, 300);
      }
    }

    if (json.tuned_in) {
      clear_audio_errors();
    }
  };

  var clear_audio_errors = function (e) {
    ErrorHandler.remove_permanent_error("m3u_hijack_right_click");
    ErrorHandler.remove_permanent_error("audio_error");
    ErrorHandler.remove_permanent_error("audio_connect_error");
    el.classList.remove("working");
  };

  if (!Prefs.get("vol") || Prefs.get("vol") > 1 || Prefs.get("vol") < 0) {
    self.setVolume(0.85);
  } else {
    self.setVolume(Prefs.get("vol"));
  }
  self.addEventListener("volumeChange", function () {
    if (self.isMuted) {
      el.classList.add("muted");
    } else {
      el.classList.remove("muted");
    }
    Prefs.change("vol", self.volume);
    draw_volume(self.volume);
  });

  self.addEventListener("stop", function () {
    el.classList.remove("playing");
    clear_audio_errors();
    ErrorHandler.remove_permanent_error("chrome_mobile_takes_time");
  });

  self.addEventListener("loading", function () {
    el.classList.add("working");
  });

  self.addEventListener("playing", function () {
    el.classList.add("playing");
    el.classList.remove("working");
    ErrorHandler.remove_permanent_error("chrome_mobile_takes_time");
    clear_audio_errors();
  });

  self.addEventListener("stall", function (evt) {
    el.classList.add("working");
    // var append;
    // if (evt.detail) {
    // 	append = document.createElement("span");
    // 	append.textContent = evt.detail;
    // }
    ErrorHandler.permanent_error(
      ErrorHandler.make_error("audio_connect_error", 500)
    ); // , append);
  });

  self.addEventListener("error", function () {
    self.stop();
    var a = document.createElement("a");
    a.setAttribute("href", "/tune_in/" + User.sid + ".mp3");
    a.className = "link obvious";
    a.textContent = $l("try_external_player");
    a.addEventListener("click", function () {
      clear_audio_errors();
    });
    ErrorHandler.nonpermanent_error(
      ErrorHandler.make_error("audio_error", 500),
      a
    );
  });

  var volume_control_mousedown = function (evt) {
    if (evt.button !== 0) return;
    var node = volume_container;
    offset_left = node.offsetLeft;
    while ((node = node.parentNode)) {
      if (node.offsetLeft) {
        offset_left += node.offsetLeft;
      }
    }
    console.log(offset_left);
    change_volume_from_mouse(evt);
    if (self.isMuted) {
      self.toggleMute();
    }
    volume_el.addEventListener("mousemove", change_volume_from_mouse);
    document.addEventListener("mouseup", volume_control_mouseup);
  };

  var volume_control_mouseup = function (evt) {
    volume_el.removeEventListener("mousemove", change_volume_from_mouse);
    document.removeEventListener("mouseup", volume_control_mouseup);
  };

  var change_volume_from_mouse = function (evt) {
    var x = evt.pageX ? evt.pageX : evt.clientX;
    x = x - 5;
    var v = Math.min(Math.max((x - offset_left) / offset_width, 0), 1);
    if (v < 0.05) v = 0;
    if (v > 0.95) v = 1;
    if (!v || isNaN(v)) v = 0;
    self.setVolume(v);
  };

  var draw_volume = function (v) {
    volume_rect.setAttribute("width", 100 * v);
  };

  self.detect_hijack = function () {
    if (navigator.plugins && navigator.plugins.length > 0) {
      for (var i = 0; i < navigator.plugins.length; i++) {
        if (navigator.plugins[i]) {
          for (var j = 0; j < navigator.plugins[i].length; j++) {
            if (navigator.plugins[i][j].type) {
              if (navigator.plugins[i][j].type == "audio/x-mpegurl")
                return navigator.plugins[i][j].enabledPlugin.name;
            }
          }
        }
      }
    }
    return false;
  };

  if (navigator.mediaSession) {
    var msPlay = function () {
      var promise = self.play();
      if (promise && promise.then) {
        promise.then(msUpdateMetadata);
      }
    };

    var msUpdateMetadata = function () {
      var song = now_playing.songs[0];
      var art_exists = song.albums[0].art ? true : false;
      var art_url =
        "https://rainwave.cc" +
        (now_playing.songs[0].albums[0].art || "static/images4/noart_1.jpg");
      var artwork = [
        {
          src: art_url + (art_exists ? "_120.jpg" : ""),
          sizes: "120x120",
          type: "image/jpeg",
        },
        {
          src: art_url + (art_exists ? "_240.jpg" : ""),
          sizes: "240x240",
          type: "image/jpeg",
        },
        {
          src: art_url + (art_exists ? "_320.jpg" : ""),
          sizes: "320x320",
          type: "image/jpeg",
        },
      ];

      var artists = [];
      for (var i = 0; i < song.artists.length; i++) {
        artists.push(song.artists[i].name);
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: artists.join(", "),
        album: song.albums[0].name,
        artwork: artwork,
      });
    };

    navigator.mediaSession.setActionHandler("play", msPlay);
    navigator.mediaSession.setActionHandler("pause", self.stop);
    navigator.mediaSession.setActionHandler("previoustrack", msPlay);
    navigator.mediaSession.setActionHandler("nexttrack", msPlay);
    navigator.mediaSession.setActionHandler("seekbackward", function () {});
    navigator.mediaSession.setActionHandler("seekforward", function () {});
  }

  return self;
};
