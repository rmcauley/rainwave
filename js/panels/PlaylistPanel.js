panels.PlaylistPanel = {
	ytype: "fit",
	height: 300,
	minheight: 300,
	xtype: "fit",
	width: 300,
	minwidth: 300,
	title: _l("p_PlaylistPanel"),
	
	constructor: function(container) {
		var albums = {};
		var that  = {};
		var view;
		var albumlistc;
		var albumlist;
		var artistlistc;
		var artistlist;
		that.container = container;
		that.open_album = 0;
		
		theme.Extend.PlaylistPanel(that);
		
		that.initAlbumView = function(self) {
			initpiggyback['playlist'] = "true";
			lyre.sync_extra['playlist_album_diff'] = "true";
			if (lyre.sync_time > 0) {
				lyre.async_get("all_albums");
			}
		};
		
		that.initArtistView = function(self) {
			initpiggyback['artist_list'] = "true";
			if (lyre.sync_time > 0) {
				lyre.async_get("artist_list");
			}
		};
		
		// this gets redefined in that.init
		that.getCurrentTab = function() { return false; };

		that.init = function() {
			view = SplitWindow("playlist", container);
			albumlistc = view.addTab("albums", _l("pltab_albums"), that.initAlbumView);
			artistlistc = view.addTab("artists", _l("pltab_artists"), that.initArtistView);
			view.initTabs();
			
			that.getCurrentTab = view.getCurrentTab;
			
			albumlist = AlbumSearchTable(that, albumlistc, view);
			artistlist = ArtistSearchTable(that, artistlistc, view);
			
			lyre.addCallback(that.drawAlbumCallback, "playlist_album");
			lyre.addCallback(that.drawArtistCallback, "artist_detail");
			
			that.onHeightResize(container.offsetHeight);
			
			help.addStep("openanalbum", { "h": "openanalbum", "p": "openanalbum_p", "skipf": function() { view.isAnyDivOpen("album"); } });
			help.addStep("clicktorequest", { "h": "clicktorequest", "p": "clicktorequest_p" });
			help.addTutorial("request", [ "login", "tunein", "openanalbum", "clicktorequest" ]);
			help.addTopic("request", { "h": "request", "p": "request_p", "tutorial": "request" });
		};
		
		that.onHeightResize = function(height) {
			view.setHeight(height);
		};
		
		that.openLink = function(link) {
			if (link.type == "album") {
				that.openAlbum(link.id);
			}
			if (link.type == "artist") {
				that.openArtist(link.id);
			}
		};
		
		that.isAlbumOpen = function() {
			edi.openPanelLink("PlaylistPanel", "");
			return view.isAnyDivOpen();
		};
		
		that.drawAlbumCallback = function(json) {
			var wdow = view.createOpenDiv("album", json.album_id);
			json.song_data.sort(that.sortSongList);
			that.drawAlbum(wdow, json);
			albumlist.navToID(json.album_id);
			if (typeof(wdow.updateHelp) == "function") wdow.updateHelp();
			help.continueTutorialIfRunning("openanalbum");
			return true;
		};
		
		that.drawArtistCallback = function(json) {
			var wdow = view.createOpenDiv("artist", json.album_id);
			that.drawArtist(wdow, json);
			artistlist.navToID(json.artist_id);
			if (typeof(wdow.updateHelp) == "function") wdow.updateHelp();
			return true;
		};
		
		that.sortSongList = function(a, b) {
			if (a.song_available != b.song_available) {
				if (a.song_available == true) return -1;
				else return 1;
			}
			else if (a.song_title.toLowerCase() < b.song_title.toLowerCase()) return -1;
			else if (a.song_title.toLowerCase() > b.song_title.toLowerCase()) return 1;
			else return 0;
		};

		that.openAlbum = function(album_id) {
			view.switchToTab("albums");
			if (view.checkOpenDivs("album", album_id)) {
				albumlist.navToID(album_id);
				return;
			}
			lyre.async_get("album", { "album_id": album_id });
		};
		
		that.openArtist = function(artist_id) {
			view.switchToTab("artists");
			if (view.checkOpenDivs("artist", artist_id)) {
				artistlist.navToID(artist_id);
				return;
			}
			lyre.async_get("artist_detail", { "artist_id": artist_id });
		};
		
		return that;
	}
};

var AlbumSearchTable = function(parent, container, view) {
	var that = SearchTable(container, "album_id", "pl_albumlist");
	that.changeSearchKey("album_name");
	that.changeSortKey("_searchname");
	
	var initialized = false;
	
	that.afterUpdate = function(json, albums, sorted) {
		if (!initialized) {
			lyre.addCallback(that.ratingResult, "rate_result");
			lyre.addCallback(that.favResult, "fav_album_result");
			lyre.addCallback(that.update, "playlist_album_diff");
			initialized = true;
		}
	
		for (i in albums) {
			if (!albums[i].album_available) {
				// reinserts the album if it becomes available again
				if ((albums[i].album_lowest_oa - clock.now) <= 0) albums[i].album_available = true;
				that.addToUpdated(albums[i].album_id);
			}
		}
		
		var reopen;
		for (i in json) {
			reopen = view.reOpenDiv("album", json[i].album_id);
			if (reopen) {
				parent.openLink({ "type": "album", "id": json[i].album_id });
			}
		}
		
		if (albums.length > 0) help.changeStepPointEl("openanalbum", [ albums[sorted[0]].td_name ]);
	};
	
	that.sortList = function(a, b) {
		if (that.data[a].album_available != that.data[b].album_available) {
			if (that.data[a].album_available == true) return -1;
			else return 1;
		}
		else if (that.data[a]._searchname < that.data[b]._searchname) return -1;
		else if (that.data[a]._searchname > that.data[b]._searchname) return 1;
		else return 0;
	};

	that.ratingResult = function(result) {
		if (result.album_id && that.data[result.album_id]) {
			that.data[result.album_id].album_rating_user = result.album_rating;
			that.drawRating(that.data[result.album_id]);
		}
	};
	
	that.favResult = function(result) {
		if (result.album_id in that.data) {
			that.data[result.album_id].td_fav.setAttribute("class", "pl_fav_" + result.fav);
			that.data[result.album_id].album_favourite = result.fav;
		}
	};
	
	that.favSwitch = function(evt) {
		if (evt.target.album_id) {
			var setfav = that.data[evt.target.album_id].album_favourite ? false : true;
			lyre.async_get("fav_album", { "fav": setfav, "album_id": evt.target.album_id });
		}
	};
	
	that.searchAction = function(id) {
		Album.open(id);
	};

	that.drawEntry = function(album) {
		if (!album.album_name) {
			alert(album.album_id)
		}
		album.tr._search_id = album.album_id;

		album.album_rating_user = album.album_rating_user;
		var ratingx = album.album_rating_user * 10;
		album.td_name = document.createElement("td");
		album.td_name.setAttribute("class", "pl_al_name");
		if (ratingx > 0) album.td_name.style.backgroundPosition = "100% " + (-193 + ratingx) + "px";
		else album.td_name.style.backgroundPosition = "100% -200px";
		album.td_name.textContent = album.album_name;
		album.tr.appendChild(album.td_name);
		album.tr.addEventListener('click', that.updateScrollOffsetByEvt, true);
		Album.linkify(album.album_id, album.td_name);
		
		album.td_rating = document.createElement("td");
		album.td_rating.setAttribute("class", "pl_al_rating");
		album.tr.appendChild(album.td_rating);
		
		album.td_fav = document.createElement("td");
		// make sure to attach the album_id to the element that acts as the catch for a fav switch
		album.td_fav.album_id = album.album_id;
		album.td_fav.addEventListener('click', that.favSwitch, true);
		album.td_fav.setAttribute("class", "pl_fav_" + album.album_favourite);
		
		album.tr.appendChild(album.td_fav);
		//that.drawNavChange(album, false);
		//that.drawRating(album);
	};
	
	that.drawRating = function(album) {
		if ((album.album_lowest_oa - clock.now) > 0) {
			album.td_rating.textContent = formatHumanTime(album.album_lowest_oa - clock.now);
		}
		else if ("album_rating_user" in album) {
			if (album.album_rating_user > 0) album.td_rating.textContent = album.album_rating_user.toFixed(1);
			else album.td_rating.textContent = "";
		}
		
		if ("album_rating_user" in album) {
			var ratingx = album.album_rating_user * 10;
			if (album.album_rating_user == 0) ratingx = -200;
			album.td_name.style.backgroundPosition = "100% " + (-193 + ratingx) + "px";
		}
	};
	
	that.drawNavChange = function(album, highlight) {
		var cl = album.album_available ? "pl_available" : "pl_cooldown";
		if (highlight) cl += " pl_highlight";
		if (album.album_id == parent.open_album) cl += " pl_albumopen";
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
	
	lyre.addCallback(that.update, "playlist_all_albums");
	
	return that;
};

var ArtistSearchTable = function(parent, container, view) {
	var that = SearchTable(container, "artist_id", "pl_albumlist");
	that.changeSearchKey("artist_name");
	that.changeSortKey("_searchname");
	
	that.searchAction = function(id) {
		Artist.open(id);
	};

	that.drawEntry = function(artist) {
		artist.tr.setAttribute("class", "pl_available");
		var artist_td = createEl("td", { "textContent": artist.artist_name, "class": "pl_al_name" }, artist.tr);
		artist_td.addEventListener('click', that.updateScrollOffsetByEvt, true);
		Artist.linkify(artist.artist_id, artist_td);
	
		createEl("td", { "textContent": artist.artist_numsongs, "class": "pl_al_rating" }, artist.tr);		
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
	
	lyre.addCallback(that.update, "artist_list");
	
	return that;
};
