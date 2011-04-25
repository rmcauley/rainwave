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
		var idloading;
		that.container = container;
		that.open_album = 0;
		
		theme.Extend.PlaylistPanel(that);

		that.init = function() {
			view = SplitWindow("playlist", container);
			albumlistc = view.addTab("albums", _l("pltab_albums"));
			artistlistc = view.addTab("artists", _l("pltab_artists"));
			//that.clearInlineSearch();
			
			albums = [];
			albumsort = [];
			reinsert = [];
			
			albumlist = AlbumSearchTable(that, albumlistc, view);
			lyre.addCallback(that.drawAlbumCallback, "playlist_album");
			
			initpiggyback['playlist'] = "true";
			if (lyre.sync_time > 0) {
				lyre.async_get("all_albums");
			}
			
			that.onHeightResize(container.offsetHeight);
			
			/*help.addStep("openanalbum", { "h": "openanalbum", "p": "openanalbum_p", "skipf": that.isAlbumOpen });
			help.addStep("clicktorequest", { "h": "clicktorequest", "p": "clicktorequest_p" });
			help.addTutorial("request", [ "login", "tunein", "openanalbum", "clicktorequest" ]);
			help.addTopic("request", { "h": "request", "p": "request_p", "tutorial": "request" });*/
		};
		
		that.onHeightResize = function(height) {
			view.setHeight(height);
		};
		
		that.openLink = function(link) {
			if (link.type == "album") {
				that.openAlbum(link.id);
			}
		};
		
		that.isAlbumOpen = function() {
			edi.openPanelLink("PlaylistPanel", "");
			return view.isAnyDivOpen();
		};
		
		that.drawAlbumCallback = function(json) {
			if (json.album_id != idloading) return false;
			idloading = false;
			var wdow = view.createOpenDiv("album", json.album_id);
			wdow.destruct = that.destructAlbum;
			json.song_data.sort(that.sortSongList);
			that.drawAlbum(wdow.div, json);
			if (typeof(wdow.updateHelp) == "function") wdow.updateHelp();
			help.continueTutorialIfRunning("openanalbum");
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
			if (view.checkOpenDivs("album", album_id)) return;
			idloading = album_id;
			lyre.async_get("album", { "album_id": album_id });
		};
		
		return that;
	}
};

var AlbumSearchTable = function(parent, container, view) {
	var that = SearchTable(container, "album_id", "album_name", "pl_albumlist");
	
	that.drawUpdate = function(album) {
		that.drawRating();
	};
	
	that.afterUpdate = function(json, albums, sorted) {
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
		that.data[result.album_id].td_fav.setAttribute("class", "pl_fav_" + result.fav);
		that.data[result.album_id].album_favourite = result.fav;
	};
	
	that.favSwitch = function(evt) {
		if (evt.target.album_id) {
			var setfav = albums[evt.target.album_id].album_favourite ? false : true;
			lyre.async_get("fav_album", { "fav": setfav, "album_id": evt.target.album_id });
		}
	};
	
	that.searchAction = function(id) {
		var linkobj = { "type": "album", "id": id };
		parent.openLink(linkobj);
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
		that.drawNavChange(album, false);
		that.drawRating(album);
	};
	
	that.drawRating = function(album) {
		if ((album.album_lowest_oa - clock.now) > 0) {
			album.td_rating.textContent = formatHumanTime(album.album_lowest_oa - clock.now);
		}
		else {
			if (album.album_rating_user > 0) album.td_rating.textContent = album.album_rating_user.toFixed(1);
			else album.td_rating.textContent = "";
		}
		
		var ratingx = album.album_rating_user * 10;
		if (album.album_rating_user == 0) ratingx = -200;
		album.td_name.style.backgroundPosition = "100% " + (-193 + ratingx) + "px";
		album.td_rating.textContent = album.album_rating_user.toFixed(1);
	};
	
	that.drawNavChange = function(album, highlight) {
		var cl = album.album_available ? "pl_available" : "pl_cooldown";
		if (highlight) cl += " pl_highlight";
		if (album.album_id == parent.open_album) cl += " pl_albumopen";
		album.tr.setAttribute("class", cl);
	};
	
	that.drawUpdate = function(album) {
		that.drawNavChange(album, false);
	};

	that.startSearchDraw = function() {
		// albumlistc.style.paddingTop = (UISCALE * 2) + "px";
		// inlinesearch.textContent = "";
		// inlinesearchc.style.display = "block";
	};
	
	that.clearSearchDraw = function() {
		// inlinesearchc.style.display = "none";
		// albumlistc.style.paddingTop = "0px";
	};

	that.drawSearchString = function(string) {
		// inlinesearch.textContent = string;
		// albumlistc.scrollTop = 0;
	};
	
	that.scrollToID = function(album_id) {
		that.scrollTo(that.data[album_id]);
	};

	that.scrollTo = function(album) {
		if (album) {
			albumlistc.scrollTop = album.tr.offsetTop - 50;
		}
	};
	
	that.searchEnabled = function() {
		if (parent.parent.mpi && (parent.parent.mpi.focused = "PlaylistPanel")) return true;
		else if (parent.parent.mpi) return false;
		return true;
	};

	lyre.addCallback(that.ratingResult, "rate_result");
	lyre.addCallback(that.favResult, "fav_album_result");
	lyre.addCallback(that.update, "playlist_all_albums");
	lyre.addCallback(that.update, "playlist_album_diff");
};