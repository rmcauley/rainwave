panels.PlaylistPanel = {
	ytype: "fit",
	height: 300,
	minheight: 300,
	xtype: "fit",
	width: 300,
	minwidth: 300,
	title: _l("p_PlaylistPanel"),
	
	constructor: function(container) {
		var albums;
		var albumsort;
		var reinsert = [];
		var inlinetimer = false;
		var keynavpos = -1;
		var searchremoved = [];
		var updated = [];
		var opendivs = [];
		var idloading = false;
		var currentview = "album";
		var keynavtimer = false;
		var searchstring = "";
		
		var that  = {};
		that.width = container.offsetWidth;
		that.container = container;
		that.currentidopen = false;
		
		theme.Extend.PlaylistPanel(that);

		that.init = function() {
			that.draw();
			that.clearInlineSearch();
			
			albums = [];
			albumsort = [];
			reinsert = [];
			
			lyre.addCallback(that.playlistUpdate, "playlist_all_albums");
			lyre.addCallback(that.playlistUpdate, "playlist_album_diff");
			lyre.addCallback(that.drawAlbumCallback, "playlist_album");
			lyre.addCallback(that.ratingResult, "rate_result");
			lyre.addCallback(that.favResult, "fav_album_result");
			hotkey.addCallback(that.keyHandle, 0);
			
			initpiggyback['playlist'] = "true";
			if (lyre.sync_time > 0) {
				lyre.async_get("all_albums");
			}
			
			help.addStep("openanalbum", { "h": "openanalbum", "p": "openanalbum_p", "skipf": that.isAlbumOpen });
			help.addStep("clicktorequest", { "h": "clicktorequest", "p": "clicktorequest_p" });
			help.addTutorial("request", [ "login", "tunein", "openanalbum", "clicktorequest" ]);
			help.addTopic("request", { "h": "request", "p": "request_p", "tutorial": "request" });
		};
		
		that.playlistUpdate = function(json) {
			var oa;
			var i = 0;
			/*while (i < albumsort.length) {
				if (!albums[albumsort[i]].album_available) {
					that.setAlbumRating(albumsort[i]);
					if (albums[albumsort[i]].album_lowest_oa < clock.now) {
						albums[albumsort[i]].album_available = true;
						that.setRowClass(albums[albumsort[i]]);
						that.reinsertAlbum(albumsort[i]);
					}
					else i++;
				}
				else i++;
			}*/
			for (var i in json) {
				if (json[i].album_id) that.albumUpdate(json[i]);
			}
			if (!inlinetimer) {
				that.updateAlbumList();
			}
		};
		
		that.albumUpdate = function(json) {
			var album_id = json.album_id;
			var toreturn = false;
			json.album_available = (json.album_lowest_oa < clock.now) ? true : false;
			if (typeof(albums[album_id]) == "undefined") {
				albums[album_id] = json;
				that.drawAlbumlistEntry(albums[album_id]);
				updated.push(album_id);
				toreturn = true;
			}
			else if (albums[album_id].album_lowest_oa != json.album_lowest_oa) {
				albums[album_id].album_lowest_oa = json.album_lowest_oa;
				albums[album_id].album_available = json.album_available;
				updated.push(album_id);
				toreturn = true;
			}
			that.setRowClass(albums[album_id]);
			that.setAlbumRating(album_id);
			
			return toreturn;
		};
		
		that.setAlbumRating = function(album_id) {
			if ((albums[album_id].album_lowest_oa - clock.now) > 0) {
				albums[album_id].td_rating.textContent = formatHumanTime(albums[album_id].album_lowest_oa - clock.now);
			}
			else {
				if (albums[album_id].album_rating_user > 0) albums[album_id].td_rating.textContent = albums[album_id].album_rating_user.toFixed(1);
				else albums[album_id].td_rating.textContent = "";
			}
		};
		
		that.reinsertAlbum = function(album_id) {
			var io = albumsort.indexOf(album_id);
			if (io >= 0) {
				albumsort.splice(io, 1)[0];
			}
			if (reinsert.indexOf(album_id) == -1) {
				reinsert.push(album_id);
			}
		}

		that.updateAlbumList = function() {
			var i = 0;
			if (updated.length > 0) {
				for (i = 0; i < updated.length; i++) that.reinsertAlbum(updated[i]);
				updated = [];
			}
			reinsert.sort(that.sortAlbumArray);
			for (i = 0; i < albumsort.length; i++) {
				if (reinsert.length == 0) break;
				if (that.sortAlbumArray(reinsert[0], albumsort[i]) == -1) {
					that.insertBefore(albums[reinsert[0]], albums[albumsort[i]]);
					albumsort.splice(i, 0, reinsert.shift());
				}
			}
			for (i = 0; i < reinsert.length; i++) {
				albumsort.push(reinsert[i]);
				that.appendChild(albums[reinsert[i]]);
			}
			if (albumsort.length > 0) help.changeStepPointEl("openanalbum", [ albums[albumsort[0]].td_name ]);
			reinsert = new Array();
		};
		
		that.sortAlbumArray = function(a, b) {
			if (albums[a].album_available != albums[b].album_available) {
				if (albums[a].album_available == true) return -1;
				else return 1;
			}
			else if (albums[a].album_name.toLowerCase() < albums[b].album_name.toLowerCase()) return -1;
			else if (albums[a].album_name.toLowerCase() > albums[b].album_name.toLowerCase()) return 1;
			else return 0;
		};
		
		that.ratingResult = function(result) {
			if (result.album_id && albums[result.album_id]) {
				that.ratingResultDraw(albums[result.album_id], result);
			}
		};
		
		that.favResult = function(result) {
			that.favResultDraw(albums[result.album_id], result.favourite);
			albums[result.id].album_favourite = result.favourite;
		};
		
		that.favSwitch = function(evt) {
			if (evt.target.album_id) {
				var setfav = albums[evt.target.album_id].album_favourite ? false : true;
				lyre.async_get("fav_album", { "fav": setfav, "album_id": evt.target.album_id });
			}
		};
		
		that.openLink = function(link) {
			if (link.type == "album") {
				that.openAlbum(link.id);
				if (currentview == "album") {
					that.clearKeyNav();
					for (var i = 0; i < albumsort.length; i++) {
						if (albumsort[i] == link.id) keynavpos = i;
					}
					that.scrollToAlbum(albums[link.id]);
					if (inlinetimer) that.clearInlineSearch();
					var prevcid = that.currentidopen;
					that.currentidopen = link.id;
					if (prevcid) that.setRowClass(albums[prevcid]);
					that.setRowClass(albums[link.id]);
					that.updateKeyNavOffset(albums[link.id]);
				}
			}
		};
		
		that.isAlbumOpen = function() {
			edi.openPanelLink("PlaylistPanel", "");
			if (opendivs.length > 0) return true;
			return false;
		}
		
		that.checkOpenDivs = function(type, id) {
			var found = false;
			for (var i = 0; i < opendivs.length; i++) {
				if ((opendivs[i].type == type) && (opendivs[i].id == id)) {
					if (i == opendivs.length - 1) {
						return true;
					}
					found = true;
					opendivs[i].div.style.display = "block";
					if (typeof(opendivs[i].div.updateHelp) == "function") opendivs[i].div.updateHelp();
					help.continueTutorialIfRunning("openanalbum");
					opendivs.push(opendivs.splice(i, 1)[0]);
					break;
				}
			}
			if (!found) return false;
			for (i = 0; i < opendivs.length - 1; i++) {
				opendivs[i].div.style.display = "none";
			}
			return true;
		};
		
		that.createOpenDiv = function(type, id) {
			while (opendivs.length > 9) {
				that.destruct(opendivs[0]);
				that.removeOpenDiv(opendivs[0].div);
				opendivs.shift();
			}
			for (i = 0; i < opendivs.length; i++) {
				opendivs[i].div.style.display = "none";
			}
			var div = document.createElement("div");
			div.setAttribute("class", "pl_opendiv");
			that.appendOpenDiv(div);
			opendivs.push({ "div": div, "type": type, "id": id });
			return opendivs.length - 1;
		};
		
		that.drawAlbumCallback = function(json) {
			if (json.album_id != idloading) return false;
			idloading = false;
			var i = that.createOpenDiv("album", json.album_id);
			json.song_data.sort(that.sortSongList);
			that.drawAlbum(opendivs[i].div, json);
			if (typeof(opendivs[i].div.updateHelp) == "function") opendivs[i].div.updateHelp();
			help.continueTutorialIfRunning("openanalbum");
			return true;
		};

		that.openAlbum = function(album_id) {
			if (that.checkOpenDivs("album", album_id)) return;
			idloading = album_id;
			lyre.async_get("album", { "album_id": album_id });
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
		
		that.keyHandle = function(evt) {
			// only go if we have focus or we're not inside the MPI
			if (edi.mpi) {
				if (edi.focused != "PlaylistPanel") return true;
			}
		
			var resettimer = false;
			var resetkeytimer = false;
			var bubble = true;
			var code = (evt.keyCode != 0) ? evt.keyCode : evt.charCode;
			var chr = String.fromCharCode(code);
			
			var dosearch = false;
			// down arrow
			if (code == 40) {
				var lastkeypos = keynavpos;
				keynavpos++;
				while (albums[albumsort[keynavpos]] && albums[albumsort[keynavpos]].hidden) keynavpos++;
				if (!albums[albumsort[keynavpos]]) keynavpos--;
				if (lastkeypos != keynavpos) {
					bubble = false;
					if (lastkeypos >= 0) that.setRowClass(albums[albumsort[lastkeypos]], false);
					that.scrollToAlbum(albums[albumsort[keynavpos]]);
					that.setRowClass(albums[albumsort[keynavpos]], true);
				}
				else {
					keynavpos = lastkeypos;
				}
				if (inlinetimer) resettimer = true;
				resetkeytimer = true;
			}
			// up arrow
			else if ((code == 38) && (albumsort.length > 0) && (keynavpos > 0)) {
				var lastkeypos = keynavpos;
				keynavpos--;
				while (albums[albumsort[keynavpos]] && albums[albumsort[keynavpos]].hidden) keynavpos--;
				if (!albums[albumsort[keynavpos]]) keynavpos++;
				if (lastkeypos != keynavpos) {
					bubble = false;
					if (lastkeypos >= 0) that.setRowClass(albums[albumsort[lastkeypos]], false);
					that.scrollToAlbum(albums[albumsort[keynavpos]]);
					that.setRowClass(albums[albumsort[keynavpos]], true);
				}
				else {
					keynavpos = lastkeypos;
				}
				if (inlinetimer) resettimer = true;
				resetkeytimer = true;
			}
			// escape
			else if ((code == 13) && (keynavpos >= 0)) {
				that.setRowClass(albums[albumsort[keynavpos]], false);
				bubble = false;
				var linkobj = { "type": "album", "id": albumsort[keynavpos] };
				that.clearInlineSearch();
				that.openLink(linkobj);
			}
			else if (/\d/.test(chr) && inlinetimer) {
				dosearch = true;
			}
			else if (/[\w\-.&]+/.test(chr)) {
				dosearch = true;
			}
			else if (code == 32) {
				dosearch = true;
				bubble = false;
			}
			
			if (dosearch && !inlinetimer) {
				if (keynavpos >= 0) that.setRowClass(albums[albumsort[keynavpos]], false);
				that.startSearchDraw();
				that.clearKeyNav(true);
			}
			if (dosearch) {
				bubble = false;
				resettimer = true;
				searchstring += chr;
				that.performSearch(searchstring);
			}

			if (inlinetimer) {
				// backspace
				if (code == 8) {
					bubble = false;
					if (searchstring.length == 1) {
						that.clearInlineSearch();
					}
					else {
						resettimer = true;
						searchstring = searchstring.substring(0, searchstring.length - 1);
						that.performSearchBackspace(searchstring);
					}
				}
			}
			
			if (resettimer) {
				if (inlinetimer) clearTimeout(inlinetimer);
				inlinetimer = setTimeout(that.clearInlineSearch, 20000);
			}
			if (resetkeytimer) {
				if (keynavtimer) clearTimeout(keynavtimer);
				keynavtimer = setTimeout(that.clearKeyNav, 5000);
			}
			
			if (inlinetimer && (code == 27)) {
				that.clearInlineSearch();
				bubble = false;
			}
			else if ((keynavpos >= 0) && (code == 27)) {
				that.setRowClass(albums[albumsort[keynavpos]], false);
				that.clearKeyNav();
			}
			
			return bubble;
		};
		
		that.performSearch = function(text) {
			that.drawSearchString(searchstring);
			var i;
			var j;
			text = text.toLowerCase();
			
			// remove all albums that no longer match the search
			for (i = 0; i < albumsort.length; i++) {
				if (!albums[albumsort[i]].hidden && albums[albumsort[i]].album_name.toLowerCase().indexOf(text) == -1) {
					albums[albumsort[i]].hidden = true;
					that.hideChild(albums[albumsort[i]]);
					searchremoved.push(albumsort[i]);
				}
			}
		};
		
		that.performSearchBackspace = function(text) {
			that.drawSearchString(searchstring);
			text = text.toLowerCase();
			for (var i in searchremoved) {
				if (albums[searchremoved[i]].album_name.toLowerCase().indexOf(text) > -1) {
					that.unhideChild(albums[searchremoved[i]]);
					albums[searchremoved[i]].hidden = false;
				}
			}
		};
		
		that.clearKeyNav = function(reset) {
			if (keynavtimer) clearTimeout(keynavtimer);
			keynavtimer = false;
			if (keynavpos >= 0) that.setRowClass(albums[albumsort[keynavpos]], false);
			if (reset === true) {
				keynavpos = -1;
				that.setKeyNavOffset(false);
			}
		};
		
		that.clearInlineSearch = function() {
			that.clearInlineSearchDraw();
			if (inlinetimer) clearTimeout(inlinetimer);
			inlinetimer = false;
			searchstring = "";
			
			var ckeynavid = -1;
			if (keynavpos >= 0) ckeynavid = albumsort[keynavpos];
			if (inlinetimer) that.clearKeyNav(true);
			else that.clearKeyNav();
			
			if (searchremoved.length > 0) {
				for (var i = 0; i < searchremoved.length; i++) {
					that.unhideChild(albums[searchremoved[i]]);
					albums[searchremoved[i]].hidden = false;
				}
				searchremoved = [];
				that.updateAlbumList();
			}
			
			if (ckeynavid >= 0) {
				for (var i = 0; i < albumsort.length; i++) {
					if (albumsort[i] == ckeynavid) keynavpos = i;
				}
			}
		};
		
		return that;
	}
};
