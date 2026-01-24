// this special sorting fixes how Postgres ignores spaces while sorting
// the discrepency in sorting is small, but does exist, since
// many other places on the page do sorting.
var SongsTableAlbumSort = function (a, b) {
  if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
  else if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
  return 0;
};

var SongsTableSorting = function (a, b) {
  if (Prefs.get("p_songsort")) {
    if (Prefs.get("p_fav1") && Prefs.get("p_favup") && a.fave !== b.fave) {
      if (a.fave) return -1;
      else return 1;
    }

    if (Prefs.get("p_avup") && a.cool !== b.cool) {
      if (a.cool === false) return -1;
      else return 1;
    }

    if (!Prefs.get("p_fav1") && Prefs.get("p_favup") && a.fave !== b.fave) {
      if (a.fave) return -1;
      else return 1;
    }

    if (Prefs.get("p_null1")) {
      if (!a.rating_user && b.rating_user) return -1;
      if (a.rating_user && !b.rating_user) return 1;
    }

    if (Prefs.get("p_sort") === "rt") {
      if (a.rating_user < b.rating_user) return 1;
      if (a.rating_user > b.rating_user) return -1;
    }
  }

  if (a.title.toLowerCase() < b.title.toLowerCase()) return -1;
  else if (a.title.toLowerCase() > b.title.toLowerCase()) return 1;
  return 0;
};

var SongsTableDetailDraw = function (song, details) {
  // song has the $t from the songs table
  // details contains all the song data
  if (!details) return;
  if (details.rating_rank_percentile >= 50) {
    details.rating_percentile_message = $l("rating_percentile_top", {
      rating: details.rating,
      percentile: details.rating_rank_percentile,
      percentile_top: 100 - details.rating_rank_percentile,
    });
  } else {
    details.rating_percentile_message = $l("rating_percentile_bottom", {
      rating: details.rating,
      percentile: details.rating_rank_percentile,
    });
  }

  if (details.request_rank_percentile >= 50) {
    details.request_percentile_message = $l("request_percentile_top", {
      percentile: details.request_rank_percentile,
      percentile_top: 100 - details.request_rank_percentile,
    });
  } else {
    details.request_percentile_message = $l("request_percentile_bottom", {
      percentile: details.request_rank_percentile,
    });
  }

  var template = RWTemplates.detail.song_detail(details, song.$t.row);
  song.$t.details = details.$t.details;

  if (template.graph_placement) {
    var chart = RatingChart(details);
    if (chart) {
      template.graph_placement.parentNode.replaceChild(
        chart,
        template.graph_placement,
      );
    }
    template.graph_placement = null;
  }

  Router.recalculateScroll();
};

var SongsTableDetail = function (song, scrollOnOpen, sid) {
  if (!song.$t.detail_icon) {
    return;
  }
  var triggered = false;
  song.$t.detailIconClick = function (e) {
    if (song.$t.details) {
      if (song.$t.details.parentNode) {
        song.$t.details.parentNode.removeChild(song.$t.details);
      } else {
        song.$t.row.appendChild(song.$t.details);
      }
      Router.recalculateScroll();
      if (scrollOnOpen) {
        Router.scrollABit();
      }
    } else {
      if (triggered) return;
      triggered = true;
      API.async_get(
        "song",
        { id: song.id, sid: sid || User.sid, all_categories: false },
        function (json) {
          SongsTableDetailDraw(song, json.song);
          if (scrollOnOpen) {
            Router.scrollABit();
          }
        },
      );
    }
  };
  song.$t.detail_icon.addEventListener("click", song.$t.detailIconClick);
};

var MultiAlbumKeyNav = function (template, albums) {
  if (Sizing.simple) return;

  var totalSongs = 0;
  for (var i = 0; i < albums.length; i++) {
    totalSongs += albums[i].songs.length;
  }

  // keyboard nav i, keyboard nav album i
  var kni = false;
  var knai = 0;
  var keyNavMove = function (jump) {
    var step = jump < 0 ? -1 : 1;
    jump = Math.abs(jump);
    var newI = kni;
    var newAlbumI = knai;
    if (kni === false) {
      newI = 0;
      newAlbumI = 0;
    } else {
      while (jump !== 0) {
        newI += step;
        jump--;
        if (newI == albums[newAlbumI].songs.length) {
          newAlbumI++;
          if (newAlbumI == albums.length) {
            newAlbumI = albums.length - 1;
            newI = albums[newAlbumI].songs.length - 1;
            jump = 0;
          } else {
            newI = 0;
          }
        } else if (newI < 0) {
          newAlbumI--;
          if (newAlbumI < 0) {
            newAlbumI = 0;
            newI = 0;
            jump = 0;
          } else {
            newI = albums[newAlbumI].songs.length - 1;
          }
        }
      }
    }
    if (newI === kni && newAlbumI === knai) return;

    if (kni !== false) {
      albums[knai].songs[kni].$t.row.classList.remove("hover");
    }
    albums[newAlbumI].songs[newI].$t.row.classList.add("hover");

    kni = newI;
    knai = newAlbumI;

    scrollToKni();

    return true;
  };

  var scrollToKni = function () {
    var kniY = albums[knai].songs[kni].$t.row.offsetTop;
    var nowY = template._scroll.scroll_top;
    if (kniY > nowY + template._scroll.offset_height - 90) {
      template._scroll.scroll_to(kniY - template._scroll.offset_height + 90);
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
  template.keyNavEnd = function () {
    return keyNavMove(totalSongs);
  };
  template.keyNavHome = function () {
    return keyNavMove(-totalSongs);
  };
  template.keyNavPageUp = function () {
    if (!knai) {
      return false;
    }
    if (kni !== false) {
      albums[knai].songs[kni].$t.row.classList.remove("hover");
    }
    knai = Math.max(0, knai - 1);
    kni = 0;
    albums[knai].songs[kni].$t.row.classList.add("hover");

    scrollToKni();
    return true;
  };
  template.keyNavPageDown = function () {
    if (knai == albums.length - 1) {
      return;
    }
    if (kni !== false) {
      albums[knai].songs[kni].$t.row.classList.remove("hover");
    }
    knai = Math.min(albums.length - 1, knai + 1);
    kni = 0;
    albums[knai].songs[kni].$t.row.classList.add("hover");

    scrollToKni();
    return true;
  };

  template.keyNavLeft = function () {
    return false;
  };
  template.keyNavRight = function () {
    return false;
  };

  template.keyNavEnter = function () {
    if (kni !== false && albums[knai].songs[kni]) {
      Requests.add(albums[knai].songs[kni].id);
      return true;
    }
  };

  template.keyNavAddCharacter = function (chr) {
    if (kni !== false && albums[knai].songs[kni]) {
      if (chr == "i" && albums[knai].songs[kni].$t.detailIconClick) {
        albums[knai].songs[kni].$t.detailIconClick();
      } else if (parseInt(chr) >= 1 && parseInt(chr) <= 5) {
        Rating.doRating(parseInt(chr), albums[knai].songs[kni]);
      } else if (chr == "q") Rating.doRating(1.5, albums[knai].songs[kni]);
      else if (chr == "w") Rating.doRating(2.5, albums[knai].songs[kni]);
      else if (chr == "e") Rating.doRating(3.5, albums[knai].songs[kni]);
      else if (chr == "r") Rating.doRating(4.5, albums[knai].songs[kni]);
      else if (chr == "f" && User.id > 1) {
        var e = document.createEvent("Events");
        e.initEvent("click", true, false);
        albums[knai].songs[kni].$t.fave.dispatchEvent(e);
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
      albums[knai].songs[kni] &&
      albums[knai].songs[kni].$t.detailIconClick
    ) {
      albums[knai].songs[kni].$t.row.classList.remove("hover");
    }
    kni = false;
    knai = 0;
  };

  template.keyNavFocus = function () {
    if (kni === false) {
      keyNavMove(1);
    } else {
      albums[knai].songs[kni].$t.row.classList.add("hover");
    }
  };

  template.keyNavBlur = function () {
    if (kni !== false) {
      albums[knai].songs[kni].$t.row.classList.remove("hover");
    }
  };

  template._keyHandle = true;
};

export {
  SongsTableAlbumSort,
  SongsTableSorting,
  SongsTableDetailDraw,
  SongsTableDetail,
  MultiAlbumKeyNav,
};
