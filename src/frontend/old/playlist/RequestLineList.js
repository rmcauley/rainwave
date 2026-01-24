var RequestLineList = function (el) {
  var list = SearchList(el, "username");
  list.$t.noResultMessage.textContent = $l("nobody_in_line");
  list.autoTrim = true;
  list.loaded = true;
  list.listItemHeight = 65;
  list.scrollAfterLoad();

  API.add_callback("request_line", function (json) {
    for (var i = 0; i < json.length; i++) {
      json[i].id = json[i].user_id;
    }
    list.update(json);
    list.doSearchMessage();
  });

  list.sortFunction = function (a, b) {
    if (list.data[a].position < list.data[b].position) return -1;
    else if (list.data[a].position > list.data[b].position) return 1;
    return 0;
  };

  list.drawEntry = function (item) {
    item.id = item.user_id;
    item._el = document.createElement("div");
    item._el._id = item.id;
    item._el.className = "item";
    item._user = document.createElement("div");
    item._song_title = document.createElement("div");
    item._song_title.className = "requestlist_song";
    item._album_title = document.createElement("div");
    item._album_title.className = "requestlist_album";
    item._el.appendChild(item._user);
    item._el.appendChild(item._song_title);
    item._el.appendChild(item._album_title);
    list.updateItemElement(item);
  };

  list.updateItemElement = function (item) {
    item._user.textContent = item.position + ". " + item.username;
    if (item.skip || !item.song) {
      item._el.classList.add("skip");
    } else {
      item._el.classList.remove("skip");
    }
    if (item.song) {
      item._song_title.textContent = item.song.title;
      item._album_title.textContent = item.song.album_name;
    } else {
      item._song_title.textContent = $l("no_song_selected");
      item._album_title.textContent = "_";
    }
  };

  list.openId = function (id) {
    Router.change("request_line", id);
  };

  Sizing.addResizeCallback(function () {
    list.listItemHeight = Sizing.small ? 51 : 65;
  });

  return list;
};

export { RequestLineList };
