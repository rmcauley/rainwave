prefs.addPref("playlist", { "name": "sortfavfirst", "defaultvalue": false, "type": "checkbox" });
prefs.addPref("playlist", { "name": "sortreadyfirst", "defaultvalue": true, "type": "checkbox" });
prefs.addPref("playlist", { "name": "sortalbums", "defaultvalue": "album_name", "type": "dropdown", "options":
	[ 	{ "value": "_searchname", "option": _l("pref_playlist_v_albumname") },
		{ "value": "rating_user", "option": _l("pref_playlist_v_rating") },
		{ "value": "cool_lowest", "option": _l("pref_playlist_v_cooldown") },
		{ "value": "updated", "option": _l("pref_playlist_v_updated") }
	] } );
prefs.addPref("playlist", { "name": "opened", "defaultvalue": false, "hidden": true });

panels.PlaylistPanel = {
	ytype: "fit",
	height: 300,
	minheight: 300,
	xtype: "fit",
	width: 300,
	minwidth: 300,
	title: _l("p_PlaylistPanel"),
	cname: "playlist",

	constructor: function(container) {
		var albums = {};
		var that = {};
		var view;
		var albumlistc;
		var artistlistc;
		that.container = container;
		that.open_album = 0;

		theme.Extend.PlaylistPanel(that);

		// this gets redefined in that.init
		that.getCurrentTab = function() { return false; };

		that.init = function() {
			view = SplitWindow("playlist", container);
			albumlistc = view.addTab("albums", _l("pltab_albums"));
			artistlistc = view.addTab("artists", _l("pltab_artists"));
			view.initTabs();
			that.getCurrentTab = view.getCurrentTab;
			view.setHeight(container.offsetHeight);

			albumlist.setParent(that);
			albumlist.setView(view);
			albumlist.setContainer(albumlistc);
			artistlist.setParent(that);
			artistlist.setView(view);
			artistlist.setContainer(artistlistc);

			prefs.addPrefCallback("playlist", "sortfavfirst", albumlist.reinsertAll, albumlist);
			prefs.addPrefCallback("playlist", "sortreadyfirst", albumlist.reinsertAll, albumlist);
			prefs.addPrefCallback("playlist", "sortalbums", albumlist.reinsertAll, albumlist);

			lyre.addCallback(that.drawAlbumCallback, "album");
			lyre.addCallback(that.drawArtistCallback, "artist");

			that.onHeightResize(container.offsetHeight);

			help.addStep("openanalbum", { "h": "openanalbum", "p": "openanalbum_p", "skipf": function() { view.isAnyDivOpen("album"); } });

			help.addStep("playlistsearch_v2", { "h": "playlistsearch_v2", "p": "playlistsearch_v2_p", "mody": 5, "modx": 5 });
			help.addTutorial("playlistsearch_v2", [ "playlistsearch_v2" ]);
		};

		that.onHeightResize = function(height) {
			view.setHeight(height);
		};

		that.openLink = function(type, id) {
			if (type == "album") {
				that.openAlbum(id);
			}
			if (type == "artist") {
				that.openArtist(id);
			}
		};

		that.isAlbumOpen = function() {
			edi.openPanelLink(false, "playlist");
			return view.isAnyDivOpen();
		};

		that.drawAlbumCallback = function(json) {
			var wdow = view.createOpenDiv("album", json.id);
			json.songs.sort(that.sortSongList);
			that.drawAlbum(wdow, json);
			albumlist.navToID(json.id);
			if (typeof(wdow.updateHelp) == "function") wdow.updateHelp();
			help.continueTutorialIfRunning("openanalbum");
			return true;
		};

		that.drawArtistCallback = function(json) {
			var wdow = view.createOpenDiv("artist", json.id);
			that.drawArtist(wdow, json);
			artistlist.navToID(json.id);
			if (typeof(wdow.updateHelp) == "function") wdow.updateHelp();
			return true;
		};

		that.sortSongList = function(a, b) {
			if (a.cool != b.cool) {
				if (a.cool == false) return -1;
				else return 1;
			}
			else if (a.title.toLowerCase() < b.title.toLowerCase()) return -1;
			else if (a.title.toLowerCase() > b.title.toLowerCase()) return 1;
			else return 0;
		};

		that.openAlbum = function(album_id) {
			view.switchToTab("albums");
			if (view.checkOpenDivs("album", album_id)) {
				albumlist.navToID(album_id);
				return;
			}
			lyre.async_get("album", { "id": album_id });
		};

		that.openArtist = function(artist_id) {
			view.switchToTab("artists");
			if (view.checkOpenDivs("artist", artist_id)) {
				artistlist.navToID(artist_id);
				return;
			}
			lyre.async_get("artist", { "id": artist_id });
		};

		return that;
	}
};

var albumlist = function() {
	var parent = null;
	var container = null;
	var view = null;

	var that = SearchTable("id", "pl_albumlist");
	that.changeSearchKey("name");
	that.changeSortKey("_searchname");

	var initialized = false;

	that.setParent = function(new_parent) {
		parent = new_parent;
	}

	that.setContainer = function(new_container) {
		container = new_container;
		that.appendToContainer(container);
	}

	that.setView = function(new_view) {
		view = new_view;
	}

	that.afterUpdate = function(json, albums, sorted) {
		if (!initialized) {
			lyre.addCallback(that.ratingResult, "rate_result");
			lyre.addCallback(that.favResult, "fave_album_result");
			lyre.addCallback(that.update, "album_diff");
			initialized = true;
		}

		if (parent) {
			var reopen;
			for (i in json) {
				reopen = view.reOpenDiv("album", json[i].id);
				if (reopen) {
					parent.openLink("album", json[i].id);
				}
			}
		}

		if (albums.length > 0) help.changeStepPointEl("openanalbum", [ albums[sorted[0]].td_name ]);

		if (view && !prefs.getPref("playlist", "opened") && (help.getCurrentTutorial() != "request") && (help.getCurrentTutorial() != "playlistsearch_v2")) {
			help.changeStepPointEl("playlistsearch_v2", [ view.getSearchHelpEl() ]);
			prefs.changePref("playlist", "opened", true);
			prefs.savePrefs();
			help.startTutorial("playlistsearch_v2");
		}
	};

	that.sortList = function(a, b) {
		if (prefs.p.playlist.sortfavfirst.value && (that.data[a].fave != that.data[b].fave)) {
			if (that.data[a].fave) return -1;
			else return 1;
		}

		if ((prefs.p.playlist.sortreadyfirst.value || (prefs.p.playlist.sortalbums.value == "cool_lowest")) && (that.data[a].cool != that.data[b].cool)) {
			if (that.data[a].cool == false) return -1;
			else return 1;
		}

		if ((prefs.p.playlist.sortalbums.value == "rating_user") || (prefs.p.playlist.sortalbums.value == "rating")) {
			if (that.data[a][prefs.p.playlist.sortalbums.value] < that.data[b][prefs.p.playlist.sortalbums.value]) return 1;
			if (that.data[a][prefs.p.playlist.sortalbums.value] > that.data[b][prefs.p.playlist.sortalbums.value]) return -1;
		}
		else if ((prefs.p.playlist.sortalbums.value == "cool_lowest") && (that.data[a].cool == true) && (that.data[b].cool == true)) {
			if (that.data[a][prefs.p.playlist.sortalbums.value] < that.data[b][prefs.p.playlist.sortalbums.value]) return -1;
			if (that.data[a][prefs.p.playlist.sortalbums.value] > that.data[b][prefs.p.playlist.sortalbums.value]) return 1;
		}

		if (that.data[a]._searchname < that.data[b]._searchname) return -1;
		if (that.data[a]._searchname > that.data[b]._searchname) return 1;
		return 0;
	};

	that.ratingResult = function(result) {
		if (result.updated_album_ratings) {
			for (var i = 0; i < result.updated_album_ratings.length; i++) {
				var album_rating = result.updated_album_ratings[i];
				if (that.data[album_rating.id]) {
					that.data[album_rating.id].rating_user = album_rating.rating_user;
					that.drawRating(that.data[album_rating.id]);
				}
			}
		}
	};

	that.favResult = function(result) {
		if (result.id in that.data) {
			that.data[result.id].td_fav.setAttribute("class", "pl_fav_" + result.fave);
			that.data[result.id].album_favourite = result.fave;
		}
	};

	that.favSwitch = function(evt) {
		if (evt.target.album_id) {
			var setfav = that.data[evt.target.album_id].fave ? false : true;
			lyre.async_get("fave_album", { "fave": setfav, "album_id": evt.target.album_id });
		}
	};

	that.searchAction = function(id) {
		Album.open(id);
	};

	that.drawEntry = function(album) {
		album.tr._search_id = album.id;

		var ratingx = album.rating_user * 10;
		album.td_name = document.createElement("td");
		album.td_name.setAttribute("class", "pl_al_name");
		album.td_name.setAttribute("title", album.name);
		if (ratingx > 0) album.td_name.style.backgroundPosition = "100% " + (-193 + ratingx) + "px";
		else album.td_name.style.backgroundPosition = "100% -200px";
		album.td_name.textContent = album.name;
		album.tr.appendChild(album.td_name);
		album.tr.addEventListener('click', that.updateScrollOffsetByEvt, true);
		Album.linkify(album.id, album.td_name);

		album.td_rating = document.createElement("td");
		album.td_rating.setAttribute("class", "pl_al_rating");
		album.tr.appendChild(album.td_rating);

		album.td_fav = document.createElement("td");
		// make sure to attach the album_id to the element that acts as the catch for a fav switch
		album.td_fav.album_id = album.id;
		album.td_fav.addEventListener('click', that.favSwitch, true);
		album.td_fav.setAttribute("class", "pl_fav_" + album.fave);

		album.tr.appendChild(album.td_fav);
	};

	that.drawRating = function(album) {
		if (album.cool && ((album.cool_lowest - clock.now) > 0)) {
			album.td_rating.textContent = formatHumanTime(album.cool_lowest - clock.now);
		}
		else if ("rating_user" in album) {
			if (album.rating_user > 0) album.td_rating.textContent = album.rating_user.toFixed(1);
			else album.td_rating.textContent = "";
		}

		if ("rating_user" in album) {
			var ratingx = album.rating_user * 10;
			if (!album.rating_user) ratingx = -200;
			album.td_name.style.backgroundPosition = "100% " + (-193 + ratingx) + "px";
		}
		else {
			album.td_name.style.backgroundPosition = "100% -400px";
		}
	};

	that.drawNavChange = function(album, highlight) {
		var cl = album.cool ? "pl_cooldown" : "pl_available";
		if (highlight) cl += " pl_highlight";
		if (parent) { if (album.id == parent.open_album) cl += " pl_albumopen"; }
		album.tr.setAttribute("class", cl);
	};

	that.drawUpdate = function(album) {
		that.drawRating(album);
		that.drawNavChange(album, false);
	};

	that.searchEnabled = function() {
		if ((parent.getCurrentTab() == 'albums') && parent.parent.mpi && (parent.parent.focused == "PlaylistPanel")) return true;
		return false;
	};

	// lyre.addCallback(that.update, "playlist_all_albums");
	for (var i = 0; i < INITIAL_PAYLOAD.length; i++) {
		for (var j in INITIAL_PAYLOAD[i]) {
			if (j == "all_albums") {
				that.update(INITIAL_PAYLOAD[i][j]);
			}
		}
	}

	return that;
}();

var artistlist = function() {
	var parent = null;
	var container = null;
	var view = null;

	var that = SearchTable("id", "pl_albumlist");
	that.changeSearchKey("name");
	that.changeSortKey("_searchname");

	that.setParent = function(new_parent) {
		parent = new_parent;
	}

	that.setContainer = function(new_container) {
		container = new_container;
		that.appendToContainer(container);
	}

	that.setView = function(new_view) {
		view = new_view;
	}

	that.searchAction = function(id) {
		Artist.open(id);
	};

	that.drawEntry = function(artist) {
		artist.tr.setAttribute("class", "pl_available");
		var artist_td = createEl("td", { "textContent": artist.name, "class": "pl_al_name" }, artist.tr);
		artist_td.addEventListener('click', that.updateScrollOffsetByEvt, true);
		Artist.linkify(artist.id, artist_td);

		// createEl("td", { "textContent": artist.artist_numsongs, "class": "pl_al_rating" }, artist.tr);
	};

	that.drawNavChange = function(artist, highlight) {
		var cl = "pl_available";
		if (highlight) cl += " pl_highlight";
		artist.tr.setAttribute("class", cl);
	};

	that.drawUpdate = function(album) {
		return;
	};

	that.searchEnabled = function() {
		if ((parent.getCurrentTab() == 'artists') && parent.parent.mpi && (parent.parent.focused == "PlaylistPanel")) return true;
		return false;
	};

	//lyre.addCallback(that.update, "artist_list");
	for (var i = 0; i < INITIAL_PAYLOAD.length; i++) {
		for (var j in INITIAL_PAYLOAD[i]) {
			if (j == "all_artists") {
				that.update(INITIAL_PAYLOAD[i][j]);
			}
		}
	}

	return that;
}();
