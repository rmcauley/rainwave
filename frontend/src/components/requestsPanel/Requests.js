var SongList = function () {
  var list = {};

  var container;
  var el;
  var scroller;
  var padder;

  var draggingSong;
  var draggingIndex;
  var orderChanged = false;
  var originalMouseY;
  var originalRequestY;
  var lastMouseEvent;
  var currentDraggingY;
  var upperNormalFold;
  var lowerNormalFold;
  var upperFold;
  var lowerFold;

  var songs = [];

  list.getSongs = function () {
    return songs;
  };

  list.getScroller = function () {
    return scroller;
  };

  list.onDraw = function () {
    scroller = Scrollbar.create(el, false, true);
    Sizing.requestsAreas.push(scroller.scrollblock);

    // delay panel slide out
    // if (Prefs.get("pwr")) {
    // 	var move_out = function() {
    // 		out_timer = false;
    // 		scroller.scrollblock.parentNode.classList.remove("panel_open");
    // 	};
    // 	var out_timer = false;
    // 	scroller.scrollblock.addEventListener("mouseenter", function() {
    // 		scroller.scrollblock.parentNode.classList.add("panel_open");
    // 		if (out_timer) {
    // 			clearTimeout(out_timer);
    // 			out_timer = false;
    // 		}
    // 	});
    // 	scroller.scrollblock.addEventListener("mouseleave", function() {
    // 		if (!out_timer) {
    // 			out_timer = setTimeout(move_out, 200);
    // 		}
    // 	});
    // }

    scroller.scrollblock.parentNode.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  };

  list.onInit = function ($t) {
    el = $t.song_list;
    container = $t.song_list_container;

    $t.panel_close.addEventListener("click", list.close);

    padder = $t.last_song_padder;
  };

  list.close = function () {
    Router.change();
  };

  list.remove = function () {};

  list.removeEvent = function () {
    if (!this._song_id) return;
    list.remove(this._song_id);
  };

  list.update = function (json) {
    if (draggingSong) {
      // we don't really need to do anything here
      // order_change will cause a request to the server
      // including any changes the user may or may not have made
      // and we'll get a fresh list of requests back
      // which'll keep things all in sync
      orderChanged = true;
      return;
    }
    var i, j, found, n;

    var newSongs = [];
    for (i = json.length - 1; i >= 0; i--) {
      found = false;
      for (j = songs.length - 1; j >= 0; j--) {
        if (json[i].id == songs[j].id) {
          songs[j].update(json[i]);
          newSongs.unshift(songs[j]);
          songs.splice(j, 1);
          found = true;
          break;
        }
      }
      if (!found) {
        n = Song(json[i]);
        n.$t.request_drag._song_id = n.id;
        n.$t.request_drag.addEventListener("mousedown", startDrag);
        n.$t.request_drag.addEventListener("touchstart", startTouchDrag);
        n.$t.cancel._song_id = n.id;
        n.$t.cancel.addEventListener("click", list.removeEvent);
        n.el.style[Fx.transform] = "translateY(" + Sizing.height + "px)";
        newSongs.unshift(n);
        el.appendChild(n.el);
      }
    }
    for (i = songs.length - 1; i >= 0; i--) {
      Fx.removeElement(songs[i].el);
    }
    songs = newSongs;
    for (i = songs.length - 1; i >= 0; i--) {
      songs[i].updateCooldownInfo();
    }

    if (list.showQueuePaused) {
      list.showQueuePaused();
    }

    if (list.updateHeader) {
      list.updateHeader();
    }

    if (list.helpmsg) {
      if (songs.length === 0 && Sizing.simple) {
        el.appendChild(list.helpmsg);
      } else if (list.helpmsg.parentNode) {
        el.removeChild(list.helpmsg);
      }
    }

    requestNextAnimationFrame(list.reflow);

    if (list.indicate) {
      list.indicate(songs.length);
    }
  };

  list.reflow = function () {
    var runningHeight = 0;
    for (var i = 0; i < songs.length; i++) {
      songs[i]._request_y = runningHeight;
      songs[i].el.style[Fx.transform] =
        "translateY(" + (runningHeight + Sizing.height * (i + 1)) + "px)";
      runningHeight += Sizing.requestSize;
    }
    list.reflow = list.realReflow;
    scroller.set_height(runningHeight);
    requestNextAnimationFrame(list.realReflow, 20);
  };

  list.realReflow = function () {
    var runningHeight = 0;
    for (var i = 0; i < songs.length; i++) {
      if (draggingSong != songs[i]) {
        songs[i]._request_y = runningHeight;
        songs[i].el.style[Fx.transform] =
          "translateY(" + runningHeight + "px)";
      }
      runningHeight += Sizing.requestSize;
    }
    padder.style[Fx.transform] =
      "translateY(" + (runningHeight - Sizing.requestSize) + "px)";
    scroller.set_height(runningHeight);
  };

  list.findSongToRemove = function (songId) {
    var foundSong;
    var songs = list.getSongs();
    for (var i = 0; i < songs.length; i++) {
      if (songId == songs[i].id) {
        foundSong = songs[i];
        break;
      }
    }
    if (!foundSong) return;
    if (foundSong._deleted) {
      return;
    }
    foundSong._deleted = true;
    foundSong.el.classList.add("deleted");
    return foundSong;
  };

  // DRAG AND DROP *********************************************************

  var captureTouchMove = function (e) {
    lastMouseEvent = {
      clientY: e.touches[0].pageY,
      target: e.target,
    };
  };

  var captureMouseMove = function (e) {
    lastMouseEvent = e;
  };

  var continueDrag = function () {
    if (!draggingSong) return;
    var newY =
      originalRequestY -
      (originalMouseY - (lastMouseEvent.clientY + scroller.scroll_top));
    if (newY != currentDraggingY) {
      currentDraggingY = newY;
      var newIndex = Math.floor(
        (newY + Sizing.requestSize * 0.3) / Sizing.requestSize,
      );
      if (newIndex >= songs.length) newIndex = songs.length - 1;
      if (newIndex < 0) newIndex = 0;
      if (newIndex != draggingIndex) {
        songs.splice(draggingIndex, 1);
        songs.splice(newIndex, 0, draggingSong);
        list.reflow();
        draggingIndex = newIndex;
        orderChanged = true;
      }
      draggingSong.el.style[Fx.transform] = "translateY(" + newY + "px)";
    }

    if (lastMouseEvent.clientY < upperFold && scroller.scroll_top > 0) {
      scroller.scroll_to(
        scroller.scroll_top -
          (25 - Math.floor((lastMouseEvent.clientY / upperFold) * 25)),
      );
    } else if (
      lastMouseEvent.clientY > Sizing.height - lowerFold &&
      scroller.scroll_top < scroller.scroll_top_max
    ) {
      scroller.scroll_to(
        scroller.scroll_top +
          Math.floor(
            ((lowerFold - (Sizing.height - lastMouseEvent.clientY)) /
              lowerFold) *
              20,
          ),
      );
    } else if (
      upperFold != upperNormalFold &&
      lastMouseEvent.clientY > upperNormalFold + 30
    ) {
      upperFold = upperNormalFold;
    } else if (
      lowerFold != lowerNormalFold &&
      lastMouseEvent.clientY < Sizing.height - lowerNormalFold - 30
    ) {
      lowerFold = lowerNormalFold;
    }

    requestAnimationFrame(continueDrag);
  };

  var stopDrag = function () {
    container.classList.remove("dragging");
    draggingSong.el.classList.remove("dragging");
    document.body.classList.remove("unselectable");
    window.removeEventListener("mousemove", continueDrag);
    window.removeEventListener("mouseup", stopDrag);
    window.removeEventListener("touchmove", captureTouchMove);
    window.removeEventListener("touchend", stopDrag);
    draggingSong = null;
    list.reflow();

    if (orderChanged && list.onOrderChanged) {
      list.onOrderChanged();
    }
    orderChanged = false;
  };

  var startDrag = function (e) {
    if (!e.which || e.which !== 1) {
      return;
    }

    var songId = e.target._song_id || e.target.parentNode._song_id;
    if (songId) {
      for (var i = 0; i < songs.length; i++) {
        if (songId == songs[i].id) {
          draggingSong = songs[i];
          draggingIndex = i;
          break;
        }
      }
      if (!draggingSong) return;
      if (draggingSong._deleted) return;
      lastMouseEvent = e;
      originalMouseY = e.clientY + scroller.scroll_top;
      originalRequestY = draggingSong._request_y;
      upperNormalFold =
        Sizing.detailHeaderSize * 3 +
        Sizing.menuHeight +
        Math.ceil(Math.max(Sizing.songSize, Math.min(Sizing.height / 5, 200)));
      upperFold = Math.min(e.clientY, upperNormalFold);
      lowerNormalFold = Math.ceil(
        Math.max(Sizing.songSize, Math.min(Sizing.height / 5, 200)),
      );
      lowerFold = Math.min(Sizing.height - e.clientY, lowerNormalFold);
      container.classList.add("dragging");
      draggingSong.el.classList.add("dragging");
      document.body.classList.add("unselectable");
      window.addEventListener("mousemove", captureMouseMove);
      window.addEventListener("mouseup", stopDrag);
      window.addEventListener("touchmove", captureTouchMove);
      window.addEventListener("touchend", stopDrag);
      requestAnimationFrame(continueDrag);
      if (e.preventDefault) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  };

  var startTouchDrag = function (e) {
    var fakeEvent = {
      which: 1,
      clientY: e.touches[0].pageY,
      target: e.target,
    };
    e.preventDefault();
    e.stopPropagation();
    startDrag(fakeEvent);
  };

  return list;
};

var Requests = (function () {
  var list = SongList();

  var link;
  var linkText;
  var header;
  var indicator;
  var indicator2;
  var rootContainer;

  INIT_TASKS.on_draw.push(function () {
    list.onDraw();
    list.getScroller().scrollblock.classList.add("request_scrollblock");
  });

  INIT_TASKS.on_init.push(function (rootTemplate) {
    var $t = RWTemplates.requests();
    list.onInit($t, rootTemplate);

    header = $t.request_header;
    link = rootTemplate.request_link;
    linkText = rootTemplate.request_link_text;
    indicator = rootTemplate.request_indicator;
    if (Prefs.get("pwr") && $t.request_indicator2) {
      indicator2 = $t.request_indicator2;
    }
    rootContainer = rootTemplate.requests_container;

    list.helpmsg = document.createElement("div");
    list.helpmsg.className = "blank_request_message";
    list.helpmsg.textContent = $l("make_a_request");

    API.add_callback("requests", list.update);
    API.add_callback("user", list.showQueuePaused);

    $t.requests_pause.addEventListener("click", list.pauseQueue);
    $t.requests_play.addEventListener("click", list.pauseQueue);
    $t.requests_clear.addEventListener("click", list.clearRequests);
    $t.requests_unrated.addEventListener("click", list.fillWithUnrated);
    $t.requests_favfill.addEventListener("click", list.fillWithFaves);

    link.addEventListener("click", function () {
      if (!document.body.classList.contains("requests")) {
        Router.change("requests");
      } else {
        Router.change();
      }
    });

    list.indicate = Indicator(indicator, 0, indicator2);

    rootContainer.appendChild($t._root);
  });

  list.showQueuePaused = function () {
    if (User.requests_paused) {
      rootContainer.classList.add("paused");
      link.classList.add("paused");
    } else {
      rootContainer.classList.remove("paused");
      link.classList.remove("paused");
    }
    list.updateHeader();
  };

  list.updateHeader = function () {
    var goodRequests = 0;
    var songs = list.getSongs();
    var allBad = songs.length > 0;
    for (var i = 0; i < songs.length; i++) {
      if (songs[i].valid) {
        allBad = false;
        goodRequests++;
      }
    }

    rootContainer.classList.remove("warning");
    link.classList.remove("warning");
    header.removeAttribute("href");
    header.classList.add("no_pointer");

    if (User.tuned_in) {
      if (!User.requests_paused) {
        if (link && goodRequests) {
          if (!Sizing.simple) {
            linkText.textContent = $l("#_requests", {
              num_requests: goodRequests,
            });
          } else {
            linkText.textContent = $l("#_requests", {
              num_requests: songs.length,
            });
          }
        } else if (link) {
          linkText.textContent = $l("Requests");
        }

        if (allBad) {
          header.textContent = $l("requests_all_on_cooldown");
          rootContainer.classList.add("warning");
          link.classList.add("warning");
        } else if (User.request_position) {
          header.textContent = $l("request_you_are_x_in_line", {
            position: User.request_position,
          });
          header.setAttribute("href", "#!/request_line");
          header.classList.remove("no_pointer");
        } else {
          header.textContent = $l("Requests");
        }
      } else {
        header.textContent = $l("request_grab_tag__paused");
        if (link) {
          linkText.textContent = $l("request_grab_tag__paused");
        }
      }
    } else {
      header.textContent = $l("Requests");
      if (link) {
        linkText.textContent = $l("Requests");
      }
    }
  };

  list.pauseQueue = function () {
    if (User.requests_paused) {
      API.async_get("unpause_request_queue");
    } else {
      API.async_get("pause_request_queue");
    }
  };

  list.clearRequests = function () {
    API.async_get("clear_requests");
  };

  list.fillWithUnrated = function () {
    API.async_get("request_unrated_songs");
  };

  list.fillWithFaves = function () {
    API.async_get("request_favorited_songs");
  };

  list.add = function (songId) {
    API.async_get("request", { song_id: songId });
  };

  list.remove = function (songId) {
    var foundSong = list.findSongToRemove(songId);
    if (!foundSong) {
      return;
    }
    API.async_get("delete_request", { song_id: songId }, null, function () {
      foundSong._deleted = false;
      foundSong.el.classList.remove("deleted");
    });
  };

  var clicked = function () {
    if (!this._request_song_id) return;
    if (User.id === 1) {
      ErrorHandler.tooltipError(
        ErrorHandler.makeError("must_login_and_tune_in_to_request", 400),
      );
    }
    list.add(this._request_song_id);
  };

  list.makeClickable = function (el, songId) {
    el._request_song_id = songId;
    el.addEventListener("click", clicked);
  };

  list.onOrderChanged = function () {
    var songs = list.getSongs();
    var songOrder = "";
    for (var i = 0; i < songs.length; i++) {
      if (i !== 0) songOrder += ",";
      songOrder += songs[i].id;
    }
    API.async_get("order_requests", { order: songOrder });
  };

  return list;
})();

export { SongList, Requests };
