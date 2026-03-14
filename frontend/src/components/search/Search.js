var container;
var el;
var scroller;
var input;
var searchText;
var searchRegex;
var searchRegexGreedy;
var inputContainer;

function focus() {
  input.focus();
}

var searchResetColor = function () {
  inputContainer.classList.remove("search_error");
  inputContainer.classList.remove("active");
  input.removeEventListener("input", searchResetColor);
};

var searchError = function (json) {
    while (el.hasChildNodes()) {
      el.removeChild(el.lastChild);
    }

    var div = document.createElement("div");
    div.className = "no_result_message";
    div.textContent = $l(json.tl_key, json);
    el.appendChild(div);

    inputContainer.classList.add("search_error");
    input.addEventListener("input", searchResetColor);

    return true;
  };

  var clearSearch = function () {
    while (el.hasChildNodes()) {
      el.removeChild(el.lastChild);
    }
    input.value = "";
    inputContainer.classList.remove("has_value");
    searchResetColor();
  };

  var highlightText = function (title) {
    // too many characters = too big a regex.  NOPE.
    if (searchText.length > 8) return;
    var t = title.textContent;
    var m = t.match(searchRegex);
    if (!m) {
      m = t.match(searchRegexGreedy);
    }
    if (m && m.length == 4) {
      title.textContent = "";

      if (m[1]) {
        var beforeEl = document.createElement("span");
        beforeEl.textContent = m[1];
        title.appendChild(beforeEl);
      }

      var highlightEl = document.createElement("span");
      highlightEl.className = "search_highlight";
      highlightEl.textContent = m[2];
      title.appendChild(highlightEl);

      if (m[2]) {
        var afterEl = document.createElement("span");
        afterEl.textContent = m[3];
        title.appendChild(afterEl);
      }
    }
  };

  var searchResult = function (json) {
    if (json.artists.length + json.albums.length + json.songs.length === 0) {
      return searchError({ tl_key: "no_search_results" });
    }

    while (el.hasChildNodes()) {
      el.removeChild(el.lastChild);
    }

    inputContainer.classList.add("active");
    input.addEventListener("input", searchResetColor);
    RWTemplates.search_results(json, el);
    var div, a, i;

    for (i = 0; i < json.artists.length; i++) {
      highlightText(json.artists[i].$t.title);
    }

    for (i = 0; i < json.albums.length; i++) {
      highlightText(json.albums[i].$t.title);
      Fave.register(json.albums[i], true);
      Rating.register(json.albums[i]);
    }

    for (i = 0; i < json.songs.length; i++) {
      highlightText(json.songs[i].$t.title);

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
        Requests.makeClickable(json.songs[i].$t.title, json.songs[i].id);
      }
      SongsTableDetail(json.songs[i], i > json.songs.length - 4);
    }

    scroller.set_height(false);
    scroller.refresh();
  };

  var doSearch = function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (Formatting.make_searchable_string(input.value).trim().length < 3) {
      // fake a server response
      searchError({ tl_key: "search_string_too_short" });
      return;
    }
    searchText = input.value.trim();
    var rawRe = Formatting.make_searchable_string(searchText)
      .split("")
      .join("{1}[^ws]?");
    searchRegex = new RegExp("^(.*?)(" + rawRe + ")", "i");
    rawRe = Formatting.make_searchable_string(searchText)
      .split("")
      .join("{1}[^ws]*?");
    searchRegexGreedy = new RegExp("^(.*?)(" + rawRe + ")", "i");
    API.async_get(
      "search",
      { search: input.value },
      searchResult,
      searchError,
    );
  };

INIT_TASKS.on_init.push(function (rootTemplate) {
  container = rootTemplate.search_results_container;
  el = rootTemplate.search_results;
  input = rootTemplate.search;
  inputContainer = rootTemplate.search_box_container;

  rootTemplate.search_container.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  rootTemplate.search_close.addEventListener("click", function () {
    if (!Sizing.simple) {
      Router.openLastId();
    } else {
      Router.change();
    }
  });

  rootTemplate.search_link.addEventListener("click", function () {
    if (!document.body.classList.contains("search_open")) {
      Router.change("search");
    } else if (!Sizing.simple) {
      Router.openLastId();
    } else {
      Router.change();
    }
  });

  rootTemplate.search_form.addEventListener("submit", doSearch);

    input.addEventListener("keypress", function (evt) {
      if (evt.keyCode == 27) {
        clearSearch();
      } else {
        searchResetColor();
      }
    });
    input.addEventListener("input", function () {
      if (input.value && !inputContainer.classList.contains("has_value")) {
        inputContainer.classList.add("has_value");
      } else if (
        !input.value &&
        inputContainer.classList.contains("has_value")
      ) {
        inputContainer.classList.remove("has_value");
      }
    });
  rootTemplate.search_cancel.addEventListener("click", function () {
    clearSearch();
    focus();
  });
});

INIT_TASKS.on_draw.push(function () {
  scroller = Scrollbar.create(container);
});

export { focus };
