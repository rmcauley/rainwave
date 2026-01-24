let albumCallback = null;

INIT_TASKS.on_init.push(function () {
  API.add_callback("fave_song_result", songFaveUpdate);
  API.add_callback("fave_album_result", albumFaveUpdate);
  API.add_callback("fave_all_songs_result", songFaveAllUpdate);
});

function changeFave(elName, json, favetype) {
  if (!json.success) return;

  var faves = document.getElementsByName(elName);
  var funcn = json.fave ? "add" : "remove";
  for (var i = 0; i < faves.length; i++) {
    faves[i].classList[funcn]("is_fave");
    faves[i].classList.remove("fave_clicked");
    if (faves[i].parentNode)
      faves[i].parentNode.classList[funcn](favetype + "_fave_highlight");
    if (faves[i]._go_one_up)
      faves[i].parentNode.parentNode.classList[funcn](
        favetype + "_fave_highlight",
      );
  }

  if (favetype == "album" && albumCallback) albumCallback(json);
}

function songFaveUpdate(json) {
  changeFave("sfave_" + json.id, json, "song");
}

function songFaveAllUpdate(json) {
  for (var i = 0; i < json.song_ids.length; i++) {
    changeFave("sfave_" + json.song_ids[i], json, "song");
  }
}

function albumFaveUpdate(json) {
  changeFave("afave_" + json.id, json, "album");
  if (albumCallback) {
    albumCallback(json);
  }
}

function doFave(e) {
  if (!this._fave_id) return;
  if (e && e.stopPropagation) e.stopPropagation();
  var setTo = !this.classList.contains("is_fave");
  if (
    this.getAttribute("name") &&
    this.getAttribute("name").substring(0, 5) == "sfave"
  ) {
    API.async_get("fave_song", { fave: setTo, song_id: this._fave_id });
  } else {
    API.async_get("fave_album", { fave: setTo, album_id: this._fave_id });
  }
  this.classList.add("fave_clicked");
}

function register(json, isAlbum) {
  if (User.id <= 1) return;
  if (json.fave) {
    json.$t.fave.classList.add("is_fave");
    if (json.$t.fave.parentNode) {
      if (isAlbum)
        json.$t.fave.parentNode.classList.add("album_fave_highlight");
      else json.$t.fave.parentNode.classList.add("song_fave_highlight");
    }
  }
  json.$t.fave.setAttribute(
    "name",
    isAlbum ? "afave_" + json.id : "sfave_" + json.id,
  );
  json.$t.fave._fave_id = json.id;
  json.$t.fave.addEventListener("click", doFave);
}

export { albumCallback, doFave, register };
