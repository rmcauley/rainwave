var AlbumList = function (el) {
  "use strict";
  var self = SearchList(el);
  self.$t.list.classList.add("album_list_core");

  var loading = false;

  Prefs.define("p_sort", ["az", "rt"], true);
  Prefs.define("p_null1", [false, true], true);
  Prefs.define("p_favup", null, true);
  Prefs.define("p_avup", [false, true], true);
  Prefs.define("p_fav1", [false, true], true);
  Prefs.define("p_songsort", [false, true], true);

  var sort_unrated_first = Prefs.get("p_null1");
  var sort_faves_first = Prefs.get("p_favup");
  var sort_available_first = Prefs.get("p_avup");
  var prioritize_faves = Prefs.get("p_fav1");
  var songsort_same_as_album = Prefs.get("p_songsort");

  var prefs_update = function (unused_arg, unused_arg2, no_redraw) {
    sort_unrated_first = Prefs.get("p_null1");
    sort_faves_first = Prefs.get("p_favup");
    sort_available_first = Prefs.get("p_avup");
    prioritize_faves = Prefs.get("p_fav1");

    var nv = Prefs.get("p_sort");
    if (["az", "rt"].indexOf(nv) == -1) {
      Prefs.change("sort", "az");
    }
    if (nv == "rt") self.sort_function = self.sort_by_rating_user;
    else self.sort_function = self.sort_by_alpha;

    if (sort_unrated_first) {
      Prefs.change("r_incmplt", true);
    }

    var redraw_album = false;
    if (!no_redraw && self.loaded && !loading) {
      self.update([]);
      self.redraw_current_position();
      redraw_album = Prefs.get("p_songsort");
    }

    if (
      redraw_album ||
      (!no_redraw && songsort_same_as_album !== Prefs.get("p_songsort"))
    ) {
      songsort_same_as_album = Prefs.get("p_songsort");
      Router.reset_everything();
      self.set_new_open(null);
    }
  };
  Prefs.add_callback("p_null1", prefs_update);
  Prefs.add_callback("p_sort", prefs_update);
  Prefs.add_callback("p_favup", prefs_update);
  Prefs.add_callback("p_avup", prefs_update);
  Prefs.add_callback("p_fav1", prefs_update);
  Prefs.add_callback("p_songsort", prefs_update);
  Prefs.add_callback("r_incmplt", prefs_update);

  API.add_callback("all_albums_paginated", function (json) {
    if (json.has_more) {
      API.async_get("all_albums_paginated", { after: json.next });
    }
    json.data.forEach(function (album) {
      album.name_searchable = Formatting.make_searchable_string(album.name);
    });
    self.update(json.data);
    self.$t.loading_bar.style.transform =
      "scaleX(" + ((json.progress * 0.8) / 100 + 0.2) + ")";
    if (!json.has_more) {
      loading = false;
      self.loaded = true;
      self.scroll_after_load();
      self.$t.loading_bar.style.opacity = "0";
      setTimeout(function () {
        self.$t.loading_bar.style.display = "none";
      }, 500);
    }
  });

  API.add_callback("album_diff", function (json) {
    if (self.loaded) {
      json.forEach(function (album) {
        album.name_searchable = Formatting.make_searchable_string(album.name);
      });
      self.update(json);
    }
  });

  API.add_callback("outdated_data_warning", function () {
    if (!self.loaded || loading) {
      return;
    }

    if (Sizing.simple && !document.body.classList.contains("playlist_album")) {
      self.unload();
    } else {
      self.load();
    }
  });

  self.load = function () {
    if (!self.loaded && !loading) {
      self.$t.loading_bar.style.display = "block";
      self.$t.loading_bar.style.opacity = "1";
      self.$t.loading_bar.style.transform = "scaleX(0)";
      requestNextAnimationFrame(function () {
        self.$t.loading_bar.style.transform = "scaleX(0.2)";
      });
      loading = true;
      API.async_get("all_albums_paginated");
    }
  };

  self.unload = function () {
    self.wipe_data();
    loading = false;
  };

  var update_rating = function (json) {
    var album_id;
    for (var i = 0; i < json.length; i++) {
      album_id = json[i].id;
      if (album_id in self.data) {
        if ("rating" in json[i]) self.data[album_id].rating = json[i].rating;
        if ("rating_user" in json[i])
          self.data[album_id].rating_user = json[i].rating_user;
        if (json[i].rating_complete !== null)
          self.data[album_id].rating_complete = json[i].rating_complete;
        self.update_item_element(self.data[album_id]);
      }
    }
  };
  Rating.album_callback = update_rating;

  var update_fave = function (json) {
    if (json.id in self.data) {
      self.data[json.id].fave = json.fave;
      self.update_item_element(self.data[json.id]);
    }
  };
  Fave.album_callback = update_fave;

  self.open_id = function (id) {
    Router.change("album", id);
  };

  var has_new_threshold;
  var has_newish_threshold;
  if (!Clock.now && window.BOOTSTRAP && window.BOOTSTRAP.api_info) {
    has_new_threshold = window.BOOTSTRAP.api_info.time;
    has_newish_threshold = window.BOOTSTRAP.api_info.time;
  } else if (Clock.now) {
    has_new_threshold = Clock.now;
    has_newish_threshold = Clock.now;
  } else {
    has_new_threshold = parseInt(new Date().getTime() / 1000);
    has_newish_threshold = parseInt(new Date().getTime() / 1000);
  }
  has_new_threshold -= 86400 * 14;
  has_newish_threshold -= 86400 * 30;

  self.draw_entry = function (item) {
    item._el = document.createElement("div");
    item._el.className =
      "item" +
      (item.newest_song_time > has_new_threshold
        ? " has_new"
        : item.newest_song_time > has_newish_threshold
          ? " has_newish"
          : "");
    item._el._id = item.id;

    // could do this using RWTemplates.fave but... speed.  want to inline here as much as possible.
    item._el_fave = document.createElement("div");
    item._el_fave.className = "fave";
    item._el.appendChild(item._el_fave);
    var fave_lined = document.createElement("img");
    fave_lined.className = "fave_lined";
    fave_lined.src = "/static/images4/heart_lined.png";
    item._el_fave.appendChild(fave_lined);
    var fave_solid = document.createElement("img");
    fave_solid.className = "fave_solid";
    fave_solid.src = "/static/images4/heart_solid_gold.png";
    item._el_fave.appendChild(fave_solid);
    item._el_fave._fave_id = item.id;
    item._el_fave.addEventListener("click", Fave.do_fave);

    var span = document.createElement("span");
    span.className = "name";
    span.textContent = item.name;
    item._el.appendChild(span);

    self.update_cool(item);
    self.update_item_element(item);
  };

  self.update_cool = function (item) {
    if (!item._el) return;
    if (item.cool && item.cool_lowest > Clock.now) {
      item._el.classList.add("cool");
    } else {
      item._el.classList.remove("cool");
    }
  };

  self.update_item_element = function (item) {
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

  // Alphabetically compares two strings as titles, with prefixes of "A", "An",
  // and "The" stripped.
  self.article_regex = /^(The|An?)\s+/igm;

  self.compare_titles = function (a, b) {
    var a_title = a.replace(self.article_regex, "");
    var b_title = b.replace(self.article_regex, "");

    return a.localeCompare(b);
  };

  self.sort_by_alpha = function (a, b) {
    if (!self.data[a] && self.data[b]) {
      return 1;
    } else if (self.data[a] && !self.data[b]) {
      return -1;
    } else if (!self.data[a] && !self.data[b]) {
      return 0;
    }

    if (
      prioritize_faves &&
      sort_faves_first &&
      self.data[a].fave !== self.data[b].fave
    ) {
      if (self.data[a].fave) return -1;
      else return 1;
    }

    if (sort_available_first && self.data[a].cool !== self.data[b].cool) {
      if (self.data[a].cool === false) return -1;
      else return 1;
    }

    if (
      !prioritize_faves &&
      sort_faves_first &&
      self.data[a].fave !== self.data[b].fave
    ) {
      if (self.data[a].fave) return -1;
      else return 1;
    }

    if (sort_unrated_first) {
      if (!self.data[a].rating_user && self.data[b].rating_user) return -1;
      if (self.data[a].rating_user && !self.data[b].rating_user) return 1;

      if (!self.data[a].rating_complete && self.data[b].rating_complete)
        return -1;
      if (self.data[a].rating_complete && !self.data[b].rating_complete)
        return 1;
    }

    return self.compare_titles(self.data[a].name, self.data[b].name);
  };

  self.sort_by_rating_user = function (a, b) {
    if (
      prioritize_faves &&
      sort_faves_first &&
      self.data[a].fave !== self.data[b].fave
    ) {
      if (self.data[a].fave) return -1;
      else return 1;
    }

    if (sort_available_first && self.data[a].cool !== self.data[b].cool) {
      if (self.data[a].cool === false) return -1;
      else return 1;
    }

    if (
      !prioritize_faves &&
      sort_faves_first &&
      self.data[a].fave !== self.data[b].fave
    ) {
      if (self.data[a].fave) return -1;
      else return 1;
    }

    if (sort_unrated_first) {
      if (!self.data[a].rating_user && self.data[b].rating_user) return -1;
      if (self.data[a].rating_user && !self.data[b].rating_user) return 1;

      if (!self.data[a].rating_complete && self.data[b].rating_complete)
        return -1;
      if (self.data[a].rating_complete && !self.data[b].rating_complete)
        return 1;
    }

    if (self.data[a].rating_user < self.data[b].rating_user) return 1;
    if (self.data[a].rating_user > self.data[b].rating_user) return -1;

    return self.compare_titles(self.data[a].name, self.data[b].name);
  };

  prefs_update(null, null, true);

  return self;
};
