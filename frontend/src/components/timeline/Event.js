var rwSongGap = 1;

var RWEvent = function (event) {
  event.type = event.type.toLowerCase();
  event.headerText = null;
  if (!event.used && event.type.indexOf("election") != -1) {
    shuffle(event.songs);
  }
  event.showingHeader = true;
  event.height = 0;
  for (var i = 0; i < event.songs.length; i++) {
    event.songs[i]._is_timeline = true;
  }
  RWTemplates.timeline.event(event);
  event.el = event.$t.el;
  event.history = false;
  for (i = 0; i < event.songs.length; i++) {
    event.songs[i] = Song(event.songs[i], event);
    if (
      event.songs[i].$t.art &&
      event.songs[i].$t.art.classList.contains("art_expandable")
    ) {
      event.songs[i].$t.art._reset_router = true;
    }
  }

  event.reflow = function () {
    var runningHeight = 0;
    for (var i = 0; i < event.songs.length; i++) {
      event.songs[i].el.style[Fx.transform] =
        "translateY(" + runningHeight + "px)";
      if (event.songs[i].el.classList.contains("now_playing")) {
        runningHeight += Sizing.songSizeNp;
      } else if (event.songs[i].el.classList.contains("song_lost")) {
        if (Prefs.get("l_displose")) {
          runningHeight += Sizing.songSize + rwSongGap;
        }
      } else {
        runningHeight += Sizing.songSize + rwSongGap;
      }

      event.songs[i].el.style.zIndex = event.songs.length - i;
      event.songs[i].el._zIndex = event.songs.length - i;
    }
    if (event.$t.progress)
      event.$t.progress.style[Fx.transform] =
        "translateY(" + (runningHeight + 12) + "px)";
  };
  event.reflow();

  event.update = function (json) {
    for (var i in json) {
      if (typeof json[i] !== "object") {
        event[i] = json[i];
      }
    }
    event.type = event.type.toLowerCase();

    if (event.songs) {
      var j;
      for (i = 0; i < event.songs.length; i++) {
        for (j = 0; j < json.songs.length; j++) {
          if (event.songs[i].id == json.songs[j].id) {
            event.songs[i].update(json.songs[j]);
          }
        }
      }
    }
  };

  event.recalculateHeight = function () {
    if (event.$t.el.classList.contains("sched_next")) {
      event.height = event.songs.length * (Sizing.songSize + rwSongGap);
    } else if (event.$t.el.classList.contains("sched_current")) {
      if (Prefs.get("l_displose")) {
        event.height =
          (event.songs.length - 1) * (Sizing.songSize + rwSongGap) +
          Sizing.songSizeNp;
      } else {
        event.height = Sizing.songSizeNp + rwSongGap;
      }
    } else if (event.$t.el.classList.contains("sched_history")) {
      event.height = Sizing.songSize + rwSongGap;
    }
    if (event.showingHeader && !event.history)
      event.height += Sizing.timelineHeaderSize;
  };

  event.changeToComingUp = function (isContinuing) {
    event.$t.el.classList.remove("sched_history");
    event.$t.el.classList.remove("sched_current");
    event.$t.el.classList.add("sched_next");
    event.setHeaderText(isContinuing ? $l("continued") : $l("coming_up"));
    event.recalculateHeight();
  };

  event.changeToNowPlaying = function () {
    event.$t.el.classList.remove("sched_next");
    event.$t.el.classList.remove("sched_history");
    event.$t.el.classList.add("sched_current");
    Clock.pageClock = event.$t.clock;
    if (event.songs && event.songs.length > 1) {
      // other places in the code rely on songs[0] to be the winning song
      // make sure we sort properly for that condition here
      event.songs.sort(function (a, b) {
        return a.entry_position < b.entry_position ? -1 : 1;
      });
    }
    if (event.songs[0].autovoted) {
      event.songs[0].remove_autovote();
    }
    event.songs[0].el.classList.add("now_playing");
    for (var i = 1; i < event.songs.length; i++) {
      event.songs[i].el.classList.add("song_lost");
    }
    event.disableVoting();
    event.setHeaderText($l("now_playing"));
    event.recalculateHeight();
    event.reflow();
    event.progressBarStart();
  };

  event.changeToHistory = function () {
    event.$t.el.classList.remove("sched_current");
    event.$t.el.classList.remove("sched_next");
    event.$t.el.classList.add("sched_history");
    event.history = true;
    event.songs.sort(function (a, b) {
      return a.entry_position < b.entry_position ? -1 : 1;
    });
    event.songs[0].el.classList.remove("now_playing");
    for (var i = 1; i < event.songs.length; i++) {
      event.songs[i].el.classList.add("song_lost");
      Fx.removeElement(event.songs[i].el);
    }
    if (event.$t.progress.parentNode) Fx.removeElement(event.$t.progress);
    event.reflow();
    event.disableVoting();
    event.recalculateHeight();
  };

  event.enableVoting = function () {
    var alreadyVoted;
    var selfRequest = false;
    for (var i = 0; i < event.songs.length; i++) {
      event.songs[i].enableVoting();
      if (
        event.songs[i].el.classList.contains("voting_registered") ||
        event.songs[i].el.classList.contains("voting_clicked")
      ) {
        alreadyVoted = true;
      } else if (event.songs[i].elec_request_user_id == User.id) {
        selfRequest = i;
      }
    }
    if (selfRequest !== false && !alreadyVoted) {
      event.songs[selfRequest].registerVote();
      event.songs[selfRequest].autovoted = true;
      if (Prefs.get("pwr")) {
        event.songs[selfRequest].el.classList.add("autovoted");
      } else {
        event.songs[selfRequest].el.classList.add("voting_registered");
      }
    }
  };

  event.disableVoting = function () {
    for (var i = 0; i < event.songs.length; i++) {
      event.songs[i].disableVoting();
    }
  };

  event.unregisterVote = function () {
    for (var i = 0; i < event.songs.length; i++) {
      event.songs[i].unregisterVote();
    }
  };

  event.setHeaderText = function (defaultText) {
    var eventDesc = Formatting.eventName(event.type, event.name);
    if (eventDesc && !event.voting_allowed) {
      event.$t.header.textContent = defaultText + " - " + eventDesc;
    } else if (eventDesc && event.voting_allowed) {
      event.$t.header.textContent = eventDesc + " - " + $l("vote_now");
    } else if (event.voting_allowed) {
      event.$t.header.textContent = defaultText + " - " + $l("vote_now");
    } else {
      event.$t.header.textContent = defaultText;
    }
    event.headerText = event.$t.header.textContent;
    event.$t.header.setAttribute("title", event.headerText);
  };

  event.hideHeader = function () {
    event.el.classList.add("no_header");
    event.showingHeader = false;
  };

  event.showHeader = function () {
    event.el.classList.remove("no_header");
    event.showingHeader = true;
  };

  event.progressBarStart = function () {
    progressBarUpdate();
    Clock.pageClockBarFunction = progressBarUpdate;
  };

  var progressBarUpdate = function () {
    var newVal = Math.min(
      Math.max(
        Math.floor(((event.end - Clock.now) / (event.songs[0].length - 1)) * 100),
        0,
      ),
      100,
    );
    event.$t.progress_inside.style.width = newVal + "%";
  };

  event.destroy = function () {
    for (var i = 0; i < event.songs.length; i++) {
      event.songs[i].destroy();
    }
  };

  event.liveVoting = function (lvsongs) {
    var lvi, si;
    for (lvi = 0; lvi < lvsongs.length; lvi++) {
      for (si = 0; si < event.songs.length; si++) {
        if (lvsongs[lvi].entry_id == event.songs[si].entry_id) {
          event.songs[si].liveVoting(lvsongs[lvi]);
        }
      }
    }
  };

  return event;
};

export { RWEvent, rwSongGap };
