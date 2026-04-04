var ArtistList = function (el) {
  var list = SearchList(el);

  var loading = false;

  API.add_callback("all_artists_paginated", function (json) {
    if (json.has_more) {
      API.async_get("all_artists_paginated", { after: json.next });
    }
    json.data.forEach(function (artist) {
      artist.nameSearchable = Formatting.make_searchable_string(artist.name);
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

  list.load = function () {
    if (!list.loaded && !loading) {
      list.$t.loadingBar.style.display = "block";
      list.$t.loadingBar.style.opacity = "1";
      list.$t.loadingBar.style.transform = "scaleX(0)";
      requestNextAnimationFrame(function () {
        list.$t.loadingBar.style.transform = "scaleX(0.2)";
      });
      loading = true;
      API.async_get("all_artists_paginated");
    }
  };

  list.onFinishRender = function () {
    loading = false;
  };

  list.drawEntry = function (item) {
    item._el = document.createElement("div");
    item._el.className = "item";
    item._el.textContent = item.name;
    item._el._id = item.id;
  };

  list.updateItemElement = function () {
    // this has no need
  };

  list.openId = function (id) {
    Router.change("artist", id);
  };

  return list;
};

export { ArtistList };
