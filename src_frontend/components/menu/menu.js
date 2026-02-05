let template;

function stopPropagation(e) {
  e.stopPropagation();
}

function openStation(e) {
  if (RWAudio && RWAudio.isPlaying && !MOBILE) {
    e.stopPropagation();
    e.preventDefault();
    window.location.href = this._href;
    return false;
  }
}

function closeStationSelect(e) {
  if (template.station_select.classList.contains("open")) {
    template.station_select.classList.remove("open");
    template.station_select.classList.add("closed");
    template.station_select_header.removeEventListener(
      "click",
      closeStationSelect,
    );
    template.header.removeEventListener("mouseleave", closeStationSelect);

    template.station_select.removeEventListener(
      "touchstart",
      stopPropagation,
    );
    document.body.removeEventListener("touchstart", closeStationSelect);

    e.stopPropagation();
  }
}

function openStationSelect(e) {
  if (!template.station_select.classList.contains("open")) {
    template.hamburger_container.classList.remove("burger_open");
    template.station_select.classList.add("open");
    template.station_select.classList.remove("closed");
    template.station_select_header.addEventListener(
      "click",
      closeStationSelect,
    );
    template.header.addEventListener("mouseleave", closeStationSelect);

    template.station_select.addEventListener("touchstart", stopPropagation);
    document.body.addEventListener("touchstart", closeStationSelect);

    e.stopPropagation();
  }
}

function toggleStationSelect(e) {
  if (template.station_select.classList.contains("open")) {
    closeStationSelect(e);
  } else {
    openStationSelect(e);
  }
}

function updateStationInfo(json) {
  var i;
  var key;
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
}

INIT_TASKS.on_init.push(function (rootTemplate) {
  template = rootTemplate;

    // must be done in JS, if you try to do it in the template you still get a clickable <a> for
    // the station that shouldn't have a link
    for (var i = 0; i < Stations.length; i++) {
      if (Stations[i].url) {
        Stations[i].$t.menu_link.setAttribute("href", Stations[i].url);
        Stations[i].$t.menu_link._href = Stations[i].url;
        Stations[i].$t.menu_link.addEventListener("click", openStation);
      } else {
        Stations[i].$t.menu_link.classList.add("selected_station");
        if (Stations.length > 1) {
          template.station_select_header.addEventListener(
            "click",
            toggleStationSelect,
          );
          template.station_select.classList.add("openable");
          Stations[i].$t.menu_link.addEventListener(
            "mousedown",
            openStationSelect,
          );
          Stations[i].$t.menu_link.addEventListener(
            "touchstart",
            openStationSelect,
          );
        }
        rootTemplate.pulldown.addEventListener("click", toggleStationSelect);
      }
    }

    if (template.settings_link) {
      template.settings_link.addEventListener("click", SettingsWindow);
    }

    template.playlist_link.addEventListener("click", function () {
      if (document.body.classList.contains("playlist")) {
        Router.change();
      } else {
        Router.openLast();
      }
    });

    template.burger_button.addEventListener("click", function () {
      template.hamburger_container.classList.toggle("burger_open");
    });

    var closeBurger = function () {
      template.hamburger_container.classList.remove("burger_open");
    };

    template.menu_wrapper.addEventListener("mouseleave", closeBurger);
    template.request_link.addEventListener("click", closeBurger);
    template.playlist_link.addEventListener("click", closeBurger);
    template.player.addEventListener("click", closeBurger);

    if (template.user_link) {
      template.user_link.addEventListener("click", closeBurger);
    }

    if (!MOBILE) {
      API.add_callback("all_stations_info", updateStationInfo);
    }
});

export { openStation, openStationSelect, closeStationSelect, toggleStationSelect };
