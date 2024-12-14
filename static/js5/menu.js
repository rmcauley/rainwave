var Menu = (function () {
  "use strict";

  var self = {};
  var template;

  var stop_propagation = function (e) {
    e.stopPropagation();
  };

  var open_station = function (e) {
    if (RWAudio && RWAudio.isPlaying && !MOBILE) {
      e.stopPropagation();
      e.preventDefault();
      window.location.href = this._href;
      return false;
    }
  };

  var close_station_select = function (e) {
    if (template.station_select.classList.contains("open")) {
      template.station_select.classList.remove("open");
      template.station_select.classList.add("closed");
      template.station_select_header.removeEventListener(
        "click",
        close_station_select
      );
      template.header.removeEventListener("mouseleave", close_station_select);

      template.station_select.removeEventListener(
        "touchstart",
        stop_propagation
      );
      document.body.removeEventListener("touchstart", close_station_select);

      e.stopPropagation();
    }
  };

  var open_station_select = function (e) {
    if (!template.station_select.classList.contains("open")) {
      template.hamburger_container.classList.remove("burger_open");
      template.station_select.classList.add("open");
      template.station_select.classList.remove("closed");
      template.station_select_header.addEventListener(
        "click",
        close_station_select
      );
      template.header.addEventListener("mouseleave", close_station_select);

      template.station_select.addEventListener("touchstart", stop_propagation);
      document.body.addEventListener("touchstart", close_station_select);

      e.stopPropagation();
    }
  };

  var toggle_station_select = function (e) {
    if (template.station_select.classList.contains("open")) {
      close_station_select(e);
    } else {
      open_station_select(e);
    }
  };

  var update_station_info = function (json) {
    var i, key;
    for (key in json) {
      if (!json[key]) {
        continue;
      }

      for (i = 0; i < Stations.length; i++) {
        if (Stations[i].id == key && Stations[i].$t.menu_np_art) {
          Stations[i].$t.menu_np_art.style.backgroundImage =
            "url(" + json[key].art + "_120.jpg)";
          Stations[i].$t.menu_np_song.textContent = json[key].title;
          Stations[i].$t.menu_np_album.textContent = json[key].album;
        }
      }
    }
  };

  INIT_TASKS.on_init.push(function (root_template) {
    template = root_template;

    // must be done in JS, if you try to do it in the template you still get a clickable <a> for
    // the station that shouldn't have a link
    for (var i = 0; i < Stations.length; i++) {
      if (Stations[i].url) {
        Stations[i].$t.menu_link.setAttribute("href", Stations[i].url);
        Stations[i].$t.menu_link._href = Stations[i].url;
        Stations[i].$t.menu_link.addEventListener("click", open_station);
      } else {
        Stations[i].$t.menu_link.classList.add("selected_station");
        if (Stations.length > 1) {
          template.station_select_header.addEventListener(
            "click",
            toggle_station_select
          );
          template.station_select.classList.add("openable");
          Stations[i].$t.menu_link.addEventListener(
            "mousedown",
            open_station_select
          );
          Stations[i].$t.menu_link.addEventListener(
            "touchstart",
            open_station_select
          );
        }
        root_template.pulldown.addEventListener("click", toggle_station_select);
      }
    }

    if (template.settings_link) {
      template.settings_link.addEventListener("click", SettingsWindow);
    }

    template.playlist_link.addEventListener("click", function () {
      if (document.body.classList.contains("playlist")) {
        Router.change();
      } else {
        Router.open_last();
      }
    });

    template.burger_button.addEventListener("click", function () {
      template.hamburger_container.classList.toggle("burger_open");
    });

    var close_burger = function () {
      template.hamburger_container.classList.remove("burger_open");
    };

    template.menu_wrapper.addEventListener("mouseleave", close_burger);
    template.request_link.addEventListener("click", close_burger);
    template.playlist_link.addEventListener("click", close_burger);
    template.player.addEventListener("click", close_burger);

    if (template.user_link) {
      template.user_link.addEventListener("click", close_burger);
    }

    if (!MOBILE) {
      API.add_callback("all_stations_info", update_station_info);
    }
  });

  return self;
})();
