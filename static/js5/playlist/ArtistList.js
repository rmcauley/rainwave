var ArtistList = function (el) {
  "use strict";
  var self = SearchList(el);

  var loading = false;

  API.add_callback("all_artists_paginated", function (json) {
    if (json.has_more) {
      API.async_get("all_artists_paginated", { after: json.next });
    }
    json.data.forEach(function (artist) {
      artist.name_searchable = Formatting.make_searchable_string(artist.name);
    });
    self.update(json.data);
    self.$t.loading_bar.style.transform =
      "scaleX(" + (json.progress * 0.8) / 100 + ")";
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

  self.load = function () {
    if (!self.loaded && !loading) {
      self.$t.loading_bar.style.display = "block";
      self.$t.loading_bar.style.opacity = "1";
      self.$t.loading_bar.style.transform = "scaleX(0)";
      requestNextAnimationFrame(function () {
        self.$t.loading_bar.style.transform = "scaleX(0.2)";
      });
      loading = true;
      API.async_get("all_artists_paginated");
    }
  };

  self.onFinishRender = function () {
    loading = false;
  };

  self.draw_entry = function (item) {
    item._el = document.createElement("div");
    item._el.className = "item";
    item._el.textContent = item.name;
    item._el._id = item.id;
  };

  self.update_item_element = function () {
    // this has no need
  };

  self.open_id = function (id) {
    Router.change("artist", id);
  };

  return self;
};
