var SearchPanel = (function () {
  "use strict";
  var self = {};

  var container;
  var el;
  var scroller;
  var input;
  var search_text;
  var search_regex;
  var search_regex_greedy;
  var input_container;

  self.focus = function () {
    input.focus();
  };

  var search_reset_color = function () {
    input_container.classList.remove("search_error");
    input_container.classList.remove("active");
    input.removeEventListener("input", search_reset_color);
  };

  var search_error = function (json) {
    while (el.hasChildNodes()) {
      el.removeChild(el.lastChild);
    }

    var div = document.createElement("div");
    div.className = "no_result_message";
    div.textContent = $l(json.tl_key, json);
    el.appendChild(div);

    input_container.classList.add("search_error");
    input.addEventListener("input", search_reset_color);

    return true;
  };

  var clear_search = function () {
    while (el.hasChildNodes()) {
      el.removeChild(el.lastChild);
    }
    input.value = "";
    input_container.classList.remove("has_value");
    search_reset_color();
  };

  var highlight_text = function (title) {
    // too many characters = too big a regex.  NOPE.
    if (search_text.length > 8) return;
    var t = title.textContent;
    var m = t.match(search_regex);
    if (!m) {
      m = t.match(search_regex_greedy);
    }
    if (m && m.length == 4) {
      title.textContent = "";

      if (m[1]) {
        var before_el = document.createElement("span");
        before_el.textContent = m[1];
        title.appendChild(before_el);
      }

      var highlight_el = document.createElement("span");
      highlight_el.className = "search_highlight";
      highlight_el.textContent = m[2];
      title.appendChild(highlight_el);

      if (m[2]) {
        var after_el = document.createElement("span");
        after_el.textContent = m[3];
        title.appendChild(after_el);
      }
    }
  };

  var search_result = function (json) {
    if (json.artists.length + json.albums.length + json.songs.length === 0) {
      return search_error({ tl_key: "no_search_results" });
    }

    while (el.hasChildNodes()) {
      el.removeChild(el.lastChild);
    }

    input_container.classList.add("active");
    input.addEventListener("input", search_reset_color);
    RWTemplates.search_results(json, el);
    var div, a, i;

    for (i = 0; i < json.artists.length; i++) {
      highlight_text(json.artists[i].$t.title);
    }

    for (i = 0; i < json.albums.length; i++) {
      highlight_text(json.albums[i].$t.title);
      Fave.register(json.albums[i], true);
      Rating.register(json.albums[i]);
    }

    for (i = 0; i < json.songs.length; i++) {
      highlight_text(json.songs[i].$t.title);

      div = document.createElement("div");
      div.className = "album_name";
      a = document.createElement("a");
      a.setAttribute("href", "#!/album/" + json.songs[i].album_id);
      a.textContent = json.songs[i].album_name;
      div.appendChild(a);
      json.songs[i].$t.row.insertBefore(div, json.songs[i].$t.title);

      Fave.register(json.songs[i]);
      Rating.register(json.songs[i]);
      if (json.songs[i].requestable) {
        Requests.make_clickable(json.songs[i].$t.title, json.songs[i].id);
      }
      SongsTableDetail(json.songs[i], i > json.songs.length - 4);
    }

    scroller.set_height(false);
    scroller.refresh();
  };

  var do_search = function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (Formatting.make_searchable_string(input.value).trim().length < 3) {
      // fake a server response
      search_error({ tl_key: "search_string_too_short" });
      return;
    }
    search_text = input.value.trim();
    var raw_re = Formatting.make_searchable_string(search_text)
      .split("")
      .join("{1}[^ws]?");
    search_regex = new RegExp("^(.*?)(" + raw_re + ")", "i");
    raw_re = Formatting.make_searchable_string(search_text)
      .split("")
      .join("{1}[^ws]*?");
    search_regex_greedy = new RegExp("^(.*?)(" + raw_re + ")", "i");
    API.async_get(
      "search",
      { search: input.value },
      search_result,
      search_error
    );
  };

  INIT_TASKS.on_init.push(function (root_template) {
    container = root_template.search_results_container;
    el = root_template.search_results;
    input = root_template.search;
    input_container = root_template.search_box_container;

    root_template.search_container.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    root_template.search_close.addEventListener("click", function () {
      if (!Sizing.simple) {
        Router.open_last_id();
      } else {
        Router.change();
      }
    });

    root_template.search_link.addEventListener("click", function () {
      if (!document.body.classList.contains("search_open")) {
        Router.change("search");
      } else if (!Sizing.simple) {
        Router.open_last_id();
      } else {
        Router.change();
      }
    });

    root_template.search_form.addEventListener("submit", do_search);

    input.addEventListener("keypress", function (evt) {
      if (evt.keyCode == 27) {
        clear_search();
      } else {
        search_reset_color();
      }
    });
    input.addEventListener("input", function () {
      if (input.value && !input_container.classList.contains("has_value")) {
        input_container.classList.add("has_value");
      } else if (
        !input.value &&
        input_container.classList.contains("has_value")
      ) {
        input_container.classList.remove("has_value");
      }
    });
    root_template.search_cancel.addEventListener("click", function () {
      clear_search();
      self.focus();
    });
  });

  INIT_TASKS.on_draw.push(function () {
    scroller = Scrollbar.create(container);
  });

  return self;
})();
