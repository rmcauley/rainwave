function expandArt(e) {
  e.stopPropagation();

  var tgt = this;

  if (this._reset_router && Sizing.simple) {
    Router.change();
  }

  var songEl = this.parentNode.parentNode;
  if (songEl && songEl.classList.contains("song")) {
    if (songEl._art_timeout) {
      clearTimeout(songEl._art_timeout);
      songEl._art_timeout = null;
    }
    songEl.style.zIndex = 10;
    if (songEl.classList.contains("song_lost")) {
      songEl.style.opacity = 1;
    }

    var evtEl = songEl.parentNode && songEl.parentNode.parentNode;
    if (evtEl && evtEl.classList.contains("timeline_event")) {
      if (evtEl._art_timeout) {
        clearTimeout(evtEl._art_timeout);
        evtEl._art_timeout = null;
      }
      evtEl.style.zIndex = 10;
    }
  }

  if (!tgt.classList.contains("art_container")) return;
  if (tgt.classList.contains("art_expanded")) {
    normalizeArt({ target: this });
    return;
  }

  var x = e.pageX
    ? e.pageX
    : e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
  var y = e.pageY
    ? e.pageY
    : e.clientY + document.body.scrollTop + document.documentElement.scrollTop;

  tgt.classList.add("art_expanded");
  if (x < Sizing.width - 270) {
    tgt.classList.add("art_expand_right");
  } else {
    tgt.classList.add("art_expand_left");
  }
  if (y < Sizing.height - 270) {
    tgt.classList.add("art_expand_down");
  } else {
    tgt.classList.add("art_expand_up");
  }

  if ("_album_art" in tgt && tgt._album_art) {
    var fullRes = document.createElement("img");
    fullRes.onload = function () {
      var fs = document.createElement("div");
      fs.className = "art_full_size";
      fs.style.backgroundImage = "url(" + fullRes.getAttribute("src") + ")";
      tgt.appendChild(fs);
      requestNextAnimationFrame(function () {
        fs.classList.add("loaded");
      });
    };
    fullRes.setAttribute("src", tgt._album_art + "_320.jpg");
    tgt._album_art = null;
  }
}

function normalizeArt(e) {
  e.target.style.zIndex = null;
  e.target.classList.remove("art_expanded");
  e.target.classList.remove("art_expand_right");
  e.target.classList.remove("art_expand_left");
  e.target.classList.remove("art_expand_down");
  e.target.classList.remove("art_expand_up");

  var songEl = e.target.parentNode.parentNode;
  if (songEl && songEl.classList.contains("song")) {
    songEl.style.zIndex = 5;
    songEl.style.opacity = null;
    songEl._art_timeout = setTimeout(function () {
      songEl.style.zIndex = songEl._zIndex;
    }, 350);
    var evtEl = songEl.parentNode && songEl.parentNode.parentNode;
    if (evtEl && evtEl.classList.contains("timeline_event")) {
      songEl.style.zIndex = 5;
      evtEl._art_timeout = setTimeout(function () {
        evtEl.style.zIndex = null;
      }, 350);
    }
  }
}

function albumArt(artUrl, element, noExpand) {
  if (!artUrl || artUrl.length === 0) {
    element.style.backgroundImage = "url(/static/images4/noart_1.jpg)";
  } else {
    if (!MOBILE && window.devicePixelRatio && window.devicePixelRatio > 1.5) {
      element.style.backgroundImage = "url(" + artUrl + "_320.jpg)";
      element._album_art = artUrl;
    } else if (!MOBILE && Sizing.simple && !Sizing.small) {
      element.style.backgroundImage = "url(" + artUrl + "_240.jpg)";
      element._album_art = artUrl;
    } else {
      element.style.backgroundImage = "url(" + artUrl + "_120.jpg)";
      element._album_art = artUrl;
    }
    if (!MOBILE && !noExpand) {
      element.classList.add("art_expandable");
      element.addEventListener("click", expandArt);
      element.addEventListener("mouseleave", normalizeArt);
    }
  }
}

export { albumArt, expandArt, normalizeArt };
