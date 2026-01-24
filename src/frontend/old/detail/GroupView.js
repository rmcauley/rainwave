var GroupView = function (json) {
  var template;
  if (!json.$t) {
    var albums = [];
    var a, albumId, i;
    for (albumId in json.all_songs_for_sid) {
      a = json.all_songs_for_sid[albumId][0].albums[0];
      // cut off a circular memory reference quick-like
      json.all_songs_for_sid[albumId][0].albums = null;
      a.songs = json.all_songs_for_sid[albumId].sort(SongsTableSorting);
      for (i = 0; i < a.songs.length; i++) {
        a.songs[i].artists = JSON.parse(a.songs[i].artist_parseable);
      }
      albums.push(a);
    }
    albums.sort(SongsTableAlbumSort);

    template = RWTemplates.detail.group(
      { group: json, albums: albums },
      document.createElement("div"),
    );

    var j;
    for (i = 0; i < albums.length; i++) {
      for (j = 0; j < albums[i].songs.length; j++) {
        Fave.register(albums[i].songs[j]);
        Rating.register(albums[i].songs[j]);
        if (albums[i].songs[j].requestable) {
          Requests.makeClickable(
            albums[i].songs[j].$t.title,
            albums[i].songs[j].id,
          );
        }
        SongsTableDetail(
          albums[i].songs[j],
          i == albums.length - 1 && j > albums[i].songs.length - 4,
        );
      }
    }

    template._headerText = json.name;

    MultiAlbumKeyNav(template, albums);
  }

  return template;
};

export { GroupView };
