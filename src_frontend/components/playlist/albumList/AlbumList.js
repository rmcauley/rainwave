var AlbumList = function (el) {
  var list = SearchList(el);
  list.$t.list.classList.add("album_list_core");

  var loading = false;

  Prefs.define("p_sort", ["az", "rt"], true);
  Prefs.define("p_null1", [false, true], true);
  Prefs.define("p_favup", null, true);
  Prefs.define("p_avup", [false, true], true);
  Prefs.define("p_fav1", [false, true], true);
  Prefs.define("p_songsort", [false, true], true);

  var sortUnratedFirst = Prefs.get("p_null1");
  var sortFavesFirst = Prefs.get("p_favup");
  var sortAvailableFirst = Prefs.get("p_avup");
  var prioritizeFaves = Prefs.get("p_fav1");
  var songsortSameAsAlbum = Prefs.get("p_songsort");

  var prefsUpdate = function (unused_arg, unused_arg2, no_redraw) {
    sortUnratedFirst = Prefs.get("p_null1");
    sortFavesFirst = Prefs.get("p_favup");
    sortAvailableFirst = Prefs.get("p_avup");
    prioritizeFaves = Prefs.get("p_fav1");

    var nv = Prefs.get("p_sort");
    if (["az", "rt"].indexOf(nv) == -1) {
      Prefs.change("sort", "az");
    }
    if (nv == "rt") list.sortFunction = list.sortByRatingUser;
    else list.sortFunction = list.sortByAlpha;

    if (sortUnratedFirst) {
      Prefs.change("r_incmplt", true);
    }

    var redrawAlbum = false;
    if (!no_redraw && list.loaded && !loading) {
      list.update([]);
      list.redrawCurrentPosition();
      redrawAlbum = Prefs.get("p_songsort");
    }

    if (
      redrawAlbum ||
      (!no_redraw && songsortSameAsAlbum !== Prefs.get("p_songsort"))
    ) {
      songsortSameAsAlbum = Prefs.get("p_songsort");
      Router.resetEverything();
      list.setNewOpen(null);
    }
  };
  Prefs.add_callback("p_null1", prefsUpdate);
  Prefs.add_callback("p_sort", prefsUpdate);
  Prefs.add_callback("p_favup", prefsUpdate);
  Prefs.add_callback("p_avup", prefsUpdate);
  Prefs.add_callback("p_fav1", prefsUpdate);
  Prefs.add_callback("p_songsort", prefsUpdate);
  Prefs.add_callback("r_incmplt", prefsUpdate);

  API.add_callback("all_albums_paginated", function (json) {
    if (json.has_more) {
      API.async_get("all_albums_paginated", { after: json.next });
    }
    json.data.forEach(function (album) {
      album.nameSearchable = Formatting.make_searchable_string(album.name);
    });
    list.update(json.data);
    list.$t.loadingBar.style.transform =
      "scaleX(" + ((json.progress * 0.8) / 100 + 0.2) + ")";
    if (!json.has_more) {
      loading = false;
      list.loaded = true;
      list.scrollAfterLoad();
      list.$t.loadingBar.style.opacity = "0";
      setTimeout(function () {
        list.$t.loadingBar.style.display = "none";
      }, 500);
    }
  });

  API.add_callback("album_diff", function (json) {
    if (list.loaded) {
      json.forEach(function (album) {
        album.nameSearchable = Formatting.make_searchable_string(album.name);
      });
      list.update(json);
    }
  });

  API.add_callback("outdated_data_warning", function () {
    if (!list.loaded || loading) {
      return;
    }

    if (Sizing.simple && !document.body.classList.contains("playlist_album")) {
      list.unload();
    } else {
      list.load();
    }
  });

  list.load = function () {
    if (!list.loaded && !loading) {
      list.$t.loadingBar.style.display = "block";
      list.$t.loadingBar.style.opacity = "1";
      list.$t.loadingBar.style.transform = "scaleX(0)";
      requestNextAnimationFrame(function () {
        list.$t.loadingBar.style.transform = "scaleX(0.2)";
      });
      loading = true;
      API.async_get("all_albums_paginated");
    }
  };

  list.unload = function () {
    list.wipeData();
    loading = false;
  };

  var updateRating = function (json) {
    var albumId;
    for (var i = 0; i < json.length; i++) {
      albumId = json[i].id;
      if (albumId in list.data) {
        if ("rating" in json[i]) list.data[albumId].rating = json[i].rating;
        if ("rating_user" in json[i])
          list.data[albumId].rating_user = json[i].rating_user;
        if (json[i].rating_complete !== null)
          list.data[albumId].rating_complete = json[i].rating_complete;
        list.updateItemElement(list.data[albumId]);
      }
    }
  };
  Rating.album_callback = updateRating;

  var updateFave = function (json) {
    if (json.id in list.data) {
      list.data[json.id].fave = json.fave;
      list.updateItemElement(list.data[json.id]);
    }
  };
  Fave.album_callback = updateFave;

  list.openId = function (id) {
    Router.change("album", id);
  };

  var hasNewThreshold;
  var hasNewishThreshold;
  if (!Clock.now && window.BOOTSTRAP && window.BOOTSTRAP.api_info) {
    hasNewThreshold = window.BOOTSTRAP.api_info.time;
    hasNewishThreshold = window.BOOTSTRAP.api_info.time;
  } else if (Clock.now) {
    hasNewThreshold = Clock.now;
    hasNewishThreshold = Clock.now;
  } else {
    hasNewThreshold = parseInt(new Date().getTime() / 1000);
    hasNewishThreshold = parseInt(new Date().getTime() / 1000);
  }
  hasNewThreshold -= 86400 * 14;
  hasNewishThreshold -= 86400 * 30;

  list.drawEntry = function (item) {
    item._el = document.createElement("div");
    item._el.className =
      "item" +
      (item.newest_song_time > hasNewThreshold
        ? " has_new"
        : item.newest_song_time > hasNewishThreshold
          ? " has_newish"
          : "");
    item._el._id = item.id;

    // could do this using RWTemplates.fave but... speed.  want to inline here as much as possible.
    item._el_fave = document.createElement("div");
    item._el_fave.className = "fave";
    item._el.appendChild(item._el_fave);
    var faveLined = document.createElement("img");
    faveLined.className = "fave_lined";
    faveLined.src = "/static/images4/heart_lined.png";
    item._el_fave.appendChild(faveLined);
    var faveSolid = document.createElement("img");
    faveSolid.className = "fave_solid";
    faveSolid.src = "/static/images4/heart_solid_gold.png";
    item._el_fave.appendChild(faveSolid);
    item._el_fave._fave_id = item.id;
    item._el_fave.addEventListener("click", Fave.doFave);

    var span = document.createElement("span");
    span.className = "name";
    span.textContent = item.name;
    item._el.appendChild(span);

    list.updateCool(item);
    list.updateItemElement(item);
  };

  list.updateCool = function (item) {
    if (!item._el) return;
    if (item.cool && item.cool_lowest > Clock.now) {
      item._el.classList.add("cool");
    } else {
      item._el.classList.remove("cool");
    }
  };

  list.updateItemElement = function (item) {
    if (!item._el) return;

    item._el_fave.classList.remove("fave_clicked");
    if (item.fave) {
      item._el.classList.add("album_fave_highlight");
      item._el_fave.classList.add("is_fave");
    } else {
      item._el.classList.remove("album_fave_highlight");
      item._el_fave.classList.remove("is_fave");
    }

    if (item.rating_complete) {
      item._el.classList.remove("rating_incomplete");
    } else {
      item._el.classList.add("rating_incomplete");
    }

    if (item.rating_user) {
      item._el.classList.add("rating_user");
      // R4
      // item._el.style.backgroundPosition = "right " + (-(Math.round((Math.round(item.rating_user * 10) / 2)) * 30) + 6) + "px";
      // R5
      item._el.style.backgroundPosition =
        "right " +
        (-(Math.round(Math.round(item.rating_user * 10) / 2) * 28) + 6) +
        "px";
    } else {
      item._el.classList.remove("rating_user");
      // R4
      // item._el.style.backgroundPosition = "right " + (-(Math.round((Math.round((item.rating || 0) * 10) / 2)) * 30) + 6) + "px";
      // R5
      if (Prefs.get("r_noglbl") || !item.rating) {
        item._el.style.backgroundPosition = "right 6px";
      } else {
        item._el.style.backgroundPosition =
          "right " +
          (-(Math.round(Math.round(item.rating * 10) / 2) * 28) + 6) +
          "px";
      }
    }
  };

  list.sortByAlpha = function (a, b) {
    if (!list.data[a] && list.data[b]) {
      return 1;
    } else if (list.data[a] && !list.data[b]) {
      return -1;
    } else if (!list.data[a] && !list.data[b]) {
      return 0;
    }

    if (
      prioritizeFaves &&
      sortFavesFirst &&
      list.data[a].fave !== list.data[b].fave
    ) {
      if (list.data[a].fave) return -1;
      else return 1;
    }

    if (sortAvailableFirst && list.data[a].cool !== list.data[b].cool) {
      if (list.data[a].cool === false) return -1;
      else return 1;
    }

    if (
      !prioritizeFaves &&
      sortFavesFirst &&
      list.data[a].fave !== list.data[b].fave
    ) {
      if (list.data[a].fave) return -1;
      else return 1;
    }

    if (sortUnratedFirst) {
      if (!list.data[a].rating_user && list.data[b].rating_user) return -1;
      if (list.data[a].rating_user && !list.data[b].rating_user) return 1;

      if (!list.data[a].rating_complete && list.data[b].rating_complete)
        return -1;
      if (list.data[a].rating_complete && !list.data[b].rating_complete)
        return 1;
    }

    return list.data[a].name.localeCompare(list.data[b].name);
  };

  list.sortByRatingUser = function (a, b) {
    if (
      prioritizeFaves &&
      sortFavesFirst &&
      list.data[a].fave !== list.data[b].fave
    ) {
      if (list.data[a].fave) return -1;
      else return 1;
    }

    if (sortAvailableFirst && list.data[a].cool !== list.data[b].cool) {
      if (list.data[a].cool === false) return -1;
      else return 1;
    }

    if (
      !prioritizeFaves &&
      sortFavesFirst &&
      list.data[a].fave !== list.data[b].fave
    ) {
      if (list.data[a].fave) return -1;
      else return 1;
    }

    if (sortUnratedFirst) {
      if (!list.data[a].rating_user && list.data[b].rating_user) return -1;
      if (list.data[a].rating_user && !list.data[b].rating_user) return 1;

      if (!list.data[a].rating_complete && list.data[b].rating_complete)
        return -1;
      if (list.data[a].rating_complete && !list.data[b].rating_complete)
        return 1;
    }

    if (list.data[a].rating_user < list.data[b].rating_user) return 1;
    if (list.data[a].rating_user > list.data[b].rating_user) return -1;

    return list.data[a].name.localeCompare(list.data[b].name);
  };

  prefsUpdate(null, null, true);

  return list;
};

export { AlbumList };
