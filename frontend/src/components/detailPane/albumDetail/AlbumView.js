var RatingColors = {
  "1.0": "#11537f",
  "1.5": "#206898",
  "2.0": "#2873a7",
  "2.5": "#3281b7",
  "3.0": "#3789c1",
  "3.5": "#3789c1",
  "4.0": "#459cd7",
  "4.5": "#4ca6e3",
  "5.0": "#55b3f3",
};

var RatingChart = function (json) {
  var data = [];
  for (var i in RatingColors) {
    if (i in json.rating_histogram) {
      data.push({
        value: json.rating_histogram[i],
        color: RatingColors[i],
        label: i,
        tooltip: Formatting.rating(i) + ": " + json.rating_histogram[i],
      });
    }
  }
  if (data.length === 0) return;
  var c = HDivChart(data, { minShare: 4, addShareToTooltip: true });
  c.classList.add("chart_ratings");
  return c;
};

var CooldownExplanation = function () {
  Modal($l("cd_what_is"), "modal_what_is_cooldown");
};

var AlbumView = function (album) {
  album.numSongRatings = 0;
  for (var i in RatingColors) {
    if (i in album.rating_histogram) {
      album.numSongRatings += album.rating_histogram[i];
    }
  }

  album.songs.sort(SongsTableSorting);

  album.isNew = album.added_on > Clock.now - 86400 * 14;
  album.isNewish = album.added_on > Clock.now - 86400 * 30;

  album.hasNew = false;
  album.hasNewish = false;
  album.allCooldown = false;
  var onCooldown = 0;
  album.hasCooldown = false;
  for (i = 0; i < album.songs.length; i++) {
    if (album.songs[i].added_on > Clock.now - 86400 * 14) {
      album.songs[i].isNew = true;
      album.hasNew = true;
    } else if (album.songs[i].added_on > Clock.now - 86400 * 30) {
      album.songs[i].isNewish = true;
      album.hasNewish = true;
    } else {
      album.songs[i].isNew = false;
    }

    if (album.songs[i].cool) {
      album.hasCooldown = true;
      onCooldown++;
    }
  }

  if (onCooldown === album.songs.length) {
    album.allCooldown = true;
  }

  // there are some instances of old songs breaking out into new albums
  // correct for that here
  album.isNew = album.hasNew && album.isNew;
  album.isNewish = album.hasNewish && album.isNewish;

  album.newIndicator = false;
  if (album.isNew) {
    album.newIndicator = $l("new_album");
    album.newIndicatorClass = "new_indicator";
  } else if (album.isNewish) {
    album.newIndicator = $l("newish_album");
    album.newIndicatorClass = "newish_indicator";
  } else if (album.hasNew) {
    album.newIndicator = $l("new_songs");
    album.newIndicatorClass = "new_indicator";
  } else if (album.hasNewish) {
    album.newIndicator = $l("newish_songs");
    album.newIndicatorClass = "newish_indicator";
  }

  if (album.rating_rank_percentile >= 50) {
    album.ratingPercentileMessage = $l("rating_percentile_top", {
      rating: album.rating,
      percentile: album.rating_rank_percentile,
      percentile_top: 100 - album.rating_rank_percentile,
    });
  } else {
    album.ratingPercentileMessage = $l("rating_percentile_bottom", {
      rating: album.rating,
      percentile: album.rating_rank_percentile,
    });
  }

  if (album.request_rank_percentile >= 50) {
    album.requestPercentileMessage = $l("request_percentile_top", {
      percentile: album.request_rank_percentile,
      percentile_top: 100 - album.request_rank_percentile,
    });
  } else {
    album.requestPercentileMessage = $l("request_percentile_bottom", {
      percentile: album.request_rank_percentile,
    });
  }

  var template = RWTemplates.detail.album(album, document.createElement("div"));
  AlbumArt(album.art, template.art);

  if (template.category_rollover) {
    template.category_list.parentNode.removeChild(template.category_list);
    template.category_rollover.parentNode.addEventListener(
      "mouseenter",
      function () {
        template.category_rollover.parentNode.appendChild(
          template.category_list,
        );
      },
    );
    template.category_rollover.parentNode.addEventListener(
      "mouseleave",
      function () {
        template.category_list.parentNode.removeChild(template.category_list);
      },
    );
  }

  if (template.graph_placement) {
    var chart = RatingChart(album);
    if (chart) {
      template.graph_placement.parentNode.replaceChild(
        chart,
        template.graph_placement,
      );
    }
    template.graph_placement = null;
  }

  if (template.fave_all_songs) {
    var allFaveRunning = false;
    template.fave_all_songs.addEventListener("click", function () {
      if (allFaveRunning) {
        ErrorHandler.tooltipError(
          ErrorHandler.makeError("websocket_throttle", 400),
        );
      }
      allFaveRunning = true;
      API.async_get(
        "fave_all_songs",
        { album_id: album.id, fave: true },
        function () {
          allFaveRunning = false;
        },
      );
    });
    template.unfave_all_songs.addEventListener("click", function () {
      if (allFaveRunning) {
        ErrorHandler.tooltipError(
          ErrorHandler.makeError("websocket_throttle", 400),
        );
      }
      allFaveRunning = true;
      API.async_get(
        "fave_all_songs",
        { album_id: album.id, fave: false },
        function () {
          allFaveRunning = false;
        },
      );
    });
  }

  for (i = 0; i < album.songs.length; i++) {
    if (!album.songs[i].artists) {
      album.songs[i].artists = JSON.parse(album.songs[i].artist_parseable);
    }
  }
  if (User.sid == 5) {
    var songs = {};
    for (i = 0; i < album.songs.length; i++) {
      if (!songs[album.songs[i].origin_sid]) {
        songs[album.songs[i].origin_sid] = [];
      }
      songs[album.songs[i].origin_sid].push(album.songs[i]);
    }
    var forKeynav = [];
    for (i = 0; i < Stations.length; i++) {
      if (songs[Stations[i].id]) {
        var h2 = document.createElement("h2");
        h2.textContent = $l("songs_from", {
          station: $l("station_name_" + Stations[i].id),
        });
        template._root.appendChild(h2);
        template._root.appendChild(
          RWTemplates.detail.songtable({ songs: songs[Stations[i].id] })._root,
        );
        forKeynav.push({ songs: songs[Stations[i].id] });
      }
    }
    MultiAlbumKeyNav(template, forKeynav);
  } else if (album.songs.length === 0) {
    var sta;
    for (i = 0; i < Stations.length; i++) {
      if (Stations[i].id == User.sid) {
        sta = Stations[i].name;
      }
    }
    var msg = document.createElement("div");
    msg.className = "no_songs_message";
    msg.textContent = $l("no_songs_on_this_station", { station: sta });
    template._root.appendChild(msg);
  } else {
    template._root.appendChild(
      RWTemplates.detail.songtable({ songs: album.songs })._root,
    );

    if (!Sizing.simple) {
      // keyboard nav i
      var kni = false;
      var keyNavMove = function (jump) {
        var newI =
          kni === false
            ? Math.max(0, -1 + jump)
            : Math.min(album.songs.length - 1, Math.max(0, kni + jump));
        if (newI === kni) return;

        if (kni !== false) {
          album.songs[kni].$t.row.classList.remove("hover");
        }
        album.songs[newI].$t.row.classList.add("hover");
        kni = newI;
        scrollToKni();
        return true;
      };

      var scrollToKni = function () {
        var kniY = album.songs[kni].$t.row.offsetTop;
        var nowY = template._scroll.scroll_top;
        if (kniY > nowY + template._scroll.offset_height - 60) {
          template._scroll.scroll_to(
            kniY - template._scroll.offset_height + 60,
          );
        } else if (kniY < nowY + 60) {
          template._scroll.scroll_to(kniY - 60);
        }
      };

      template.keyNavDown = function () {
        return keyNavMove(1);
      };
      template.keyNavUp = function () {
        return keyNavMove(-1);
      };
      template.keyNavPageDown = function () {
        return keyNavMove(15);
      };
      template.keyNavPageUp = function () {
        return keyNavMove(-15);
      };
      template.keyNavEnd = function () {
        return keyNavMove(album.songs.length);
      };
      template.keyNavHome = function () {
        return keyNavMove(-album.songs.length);
      };

      template.keyNavLeft = function () {
        return false;
      };
      template.keyNavRight = function () {
        return false;
      };

      template.keyNavEnter = function () {
        if (kni !== false && album.songs[kni]) {
          Requests.add(album.songs[kni].id);
          return true;
        }
      };

      template.keyNavAddCharacter = function (chr) {
        if (kni !== false && album.songs[kni]) {
          if (chr == "i" && album.songs[kni].$t.detailIconClick) {
            album.songs[kni].$t.detailIconClick();
          } else if (parseInt(chr) >= 1 && parseInt(chr) <= 5) {
            Rating.doRating(parseInt(chr), album.songs[kni]);
          } else if (chr == "q") Rating.doRating(1.5, album.songs[kni]);
          else if (chr == "w") Rating.doRating(2.5, album.songs[kni]);
          else if (chr == "e") Rating.doRating(3.5, album.songs[kni]);
          else if (chr == "r") Rating.doRating(4.5, album.songs[kni]);
          else if (chr == "f" && User.id > 1) {
            var e = document.createEvent("Events");
            e.initEvent("click", true, false);
            album.songs[kni].$t.fave.dispatchEvent(e);
          }
          return true;
        }
      };
      template.keyNavBackspace = function () {
        return false;
      };

      template.keyNavEscape = function () {
        if (
          kni !== false &&
          album.songs[kni] &&
          album.songs[kni].$t.detailIconClick
        ) {
          album.songs[kni].$t.row.classList.remove("hover");
        }
        kni = false;
      };

      template.keyNavFocus = function () {
        if (kni === false) {
          keyNavMove(1);
        } else {
          album.songs[kni].$t.row.classList.add("hover");
        }
      };

      template.keyNavBlur = function () {
        if (kni !== false) {
          album.songs[kni].$t.row.classList.remove("hover");
        }
      };

      template._keyHandle = true;
    }
  }

  if (album.$t.cooldown_explanation) {
    album.$t.cooldown_explanation.addEventListener(
      "click",
      CooldownExplanation,
    );
  }

  for (i = 0; i < album.songs.length; i++) {
    Fave.register(album.songs[i]);
    Rating.register(album.songs[i]);
    if (album.songs[i].requestable) {
      Requests.makeClickable(album.songs[i].$t.title, album.songs[i].id);
    }
    SongsTableDetail(album.songs[i], i > album.songs.length - 4);
  }

  template._headerText = album.name;

  return template;
};

export { RatingColors, RatingChart, CooldownExplanation, AlbumView };
