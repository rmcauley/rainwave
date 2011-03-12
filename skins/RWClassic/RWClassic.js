function _THEME() {
	var that = {};
	var skindir = "skins_r" + BUILDNUM + "/RWClassic";

	// These are variables that Edi depends upon
	that.borderheight = 12;
	that.borderwidth = 12;
	that.textcolor = "#FFFFFF";
	that.helplinecolor = "#c287ff";
	that.helptextcolor = "#d6afff";

	// Internal variables
	var votebkg_width = 680;
	
	that.Extend = {};
	
	/*****************************************************************************
	  EDI FUNCTIONS
	*****************************************************************************/
	
	// nothing here yet...
	
	/*****************************************************************************
	  RATING EFFECTS (not required by Edi)
	*****************************************************************************/
	
	fx.extend("UserRating", function(object, duration) {
		var urfx = {};
		urfx.duration = duration;
		urfx.update = function() {
			var px = Math.round(urfx.now * 10);
			if (px <= 16) object.user_on.style.width = px + "px";
			else object.user_on.style.width = "16px";
			if (px >= 8) object.user_bar.style.backgroundPosition = (px - 50) + "px 0px";
			else object.user_bar.style.backgroundPosition = "-50px 0px";
			var text = (Math.round(urfx.now * 10) / 10).toFixed(1);
			if (text == "0.0") text = "";
			object.user_text.textContent = text;
		};
			
		return urfx;
	});
	
	fx.extend("SiteRating", function(object, duration) {
		var srfx = {};
		srfx.duration = duration;
		srfx.update = function() {
			var px = Math.round(srfx.now * 10);
			if (px <= 8) {
				object.site_on.style.opacity = "0"
				object.site_bar.style.backgroundPosition = "-50px 0px";
			}
			else {
				object.site_on.style.opacity = "1"
				object.site_bar.style.backgroundPosition = (px - 50) + "px 0px";
			}
		};
			
		return srfx;
	});

	/*****************************************************************************
	  RATING
	*****************************************************************************/

	that.Extend.Rating = function(ro) {
		var fx_user;
		var fx_site;
		var fx_fav;
		
		// This function required by Edi
		ro.draw = function(x, y, scale) {
			ro.el = createEl("div", { "class": "rating" });
			ro.user_text = createEl("span", { "class": "rating_text" }, ro.el);
			ro.fav = createEl("img", { "src": skindir + "/images/rating_fav.png", "class": "rating_fav" }, ro.el);
			ro.user_on = createEl("div", { "class": "rating_user_on" }, ro.el);
			ro.user = createEl("div", { "class": "rating_user" }, ro.el);
			ro.user_bar = createEl("div", { "class": "rating_user_bar" }, ro.user);
			ro.site_on = createEl("img", { "src": skindir + "/images/rating_site_on.png", "class": "rating_site_on" }, ro.el);
			ro.site = createEl("div", { "class": "rating_site" }, ro.el);
			ro.site_bar = createEl("div", { "class": "rating_site_bar" }, ro.site);
			ro.grid = createEl("img", { "src": skindir + "/images/rating_grid.png", "class": "rating_grid" }, ro.el);
			ro.mousecatch = ro.grid;
			
			fx_user = fx.make(fx.UserRating, [ ro, 250 ]);
			fx_site = fx.make(fx.SiteRating, [ ro, 250 ]);
			fx_fav = fx.make(fx.CSSNumeric, [ ro.fav, 250, "opacity", "" ]);	
		};

		// Required by Edi
		ro.setUser = function(userrating) {
			fx_user.set(userrating);
		};

		// Required by Edi
		ro.resetUser = function() {
			fx_user.start(ro.userrating);
		};

		// ro function required by Edi.  It may be called in animation functions.
		ro.setSite = function(siterating) {
			fx_site.set(siterating);
		};

		// ro function required by Edi.  Return the rating here.
		// Edi will round for the 0.5 stepping and clamp < 1.0 or > 5.0, no need to do that here.
		ro.userCoord = function(evt) {
			var x = 0;
			var y = 0;
			if (evt.offsetX) {
				x = evt.offsetX;
				y = evt.offsetY;
			}
			else if (evt.layerX) {
				x = evt.layerX;
				y = evt.layerY;
			}
			// This normalizes the slant to the same place regardless of Y
			x = x - y;
			
			if ((x > 53) && (x < 61)) {
				ro.favMouseOver();
			}
			else if (ro.favhover) {
				ro.favMouseOut();
			}
			
			if (x > 53) return 0;			
			return (x / 10);
		};

		// ro function required by Edi.  State: 2 = mouseover, 1 = favourite, 0 = not favourite
		ro.favChange = function(state) {
			if (state == 2) {
				fx_fav.start(0.70)
			}
			else if (state) fx_fav.start(1);
			else fx_fav.start(0);
		};

		ro.showConfirmClick = function() {
			// TODO
		};

		ro.showConfirmOK = function() {
			// TODO
		};

		ro.showConfirmBad = function() {
			// TODO
		};

		ro.resetConfirm = function() {
			// TODO
		};
		
		return ro;
	};

	/*****************************************************************************
	 TIMELINE
	*****************************************************************************/
	
	that.Extend.TimelinePanel = function(tl) {
		tl.draw = function() {
			// nothing
		};		
		return tl;
	};

	/*****************************************************************************
	 TIMELINE ELECTION
	*****************************************************************************/
	
	that.drawTimelineTable = function(evt, text, indic) {
		evt.el = createEl("table", { "class": "timeline_table", "cellspacing": 0 });
		evt.header_tr = createEl("tr", {}, evt.el);
		evt.header_indicator = createEl("td", { "class": "timeline_header_indicator timeline_header_indicator_" + indic }, evt.header_tr);
		evt.header_td = createEl("td", { "class": "timeline_header timeline_header_" + indic }, evt.header_tr);
		evt.header_clock = createEl("div", { "class": "timeline_clock" }, evt.header_td);
		evt.clock = evt.header_clock;
		evt.header_text = createEl("span", { "class": "timeline_header_text", "textContent": text }, evt.header_td);
		evt.showingheader = true;
	}
	
	that.Extend.TimelineSkeleton = function(te) {
		te.showHeader = function() {
			if (!te.showingheader) {
				te.showingheader = true;
				te.el.insertBefore(te.header_tr, te.el.firstChild);
			}
		};
		
		te.hideHeader = function() {
			if (te.showingheader) {
				te.showingheader = false;
				te.el.removeChild(te.header_tr);
			}
		};
		
		te.changeIndicator = function(indic) {
			te.header_indicator.setAttribute("class", "timeline_header_indicator timeline_header_indicator_" + indic);
			te.header_td.setAttribute("class", "timeline_header timeline_header_" + indic);
		};
	
		te.changeHeadline = function(newtext) {
			te.header_text.textContent = newtext;
		};
		
		te.drawAsCurrent = function() {
			te.clock.textContent = "";
			te.clockdisplay = false;
		};
		
		te.moveTo = function(y) {
			te.topfx.start(y);
		};
		
		te.moveXTo = function(x) {
			te.leftfx.start(x);
		};
		
		te.hideX = function() {
			te.leftfx.set(-te.el.offsetWidth)
		};
		
		te.setY = function(y) {
			te.topfx.set(y);
		};
		
		te.setX = function(x) {
			te.leftfx.set(x);
		};
		
		te.changeZ = function(z) {
			te.el.style.zIndex = z;
		};
		
		te.clockUndraw = function() {
			te.header_td.removeChild(te.header_clock);
		};
		
		te.recalculateHeight = function() {
			te.height = te.el.offsetHeight;
		};
		
		te.defineFx = function() {
			te.topfx = fx.make(fx.CSSNumeric, [ te.el, 700, "top", "px" ]);
			te.topfx.set(-200);
			te.leftfx = fx.make(fx.CSSNumeric, [ te.el, 700, "left", "px" ]);
			te.leftfx.set(0);
			te.opacityfx = fx.make(fx.CSSNumeric, [ te.el, 700, "opacity", "" ]);
			te.opacityfx.set(1);
		};
		
		te.sortSongOrder = function() {};
		
		te.emphasizeWinner = function() {};
		
		te.changeOpacity = function(to) {
			te.opacityfx.start(to);
		};
	}
	
	that.Extend.TimelineElection = function(te) {
		te.draw = function() {
			var reqstatus = 0;
			for (var i = 0; i < te.p.song_data.length; i++) {
				if (te.p.song_data[i].elec_isrequest == 1) {
					reqstatus = 1;
					break;
				}
			}
			var indic = reqstatus == 1 ? "request" : "normal";
			that.drawTimelineTable(te, _l("election"), indic);
			te.defineFx();
		};
		
		te.emphasizeWinner = function() {
			for (var i = 1; i < te.songs.length; i++) {
				te.songs[i].tr1_fx.set(0.8);
				te.songs[i].tr2_fx.set(0.8);
				te.songs[i].tr3_fx.set(0.8);
			}
		};
		
		te.drawShowWinner = function() {
			for (var i = 1; i < te.songs.length; i++) {
				te.songs[i].tr1_fx.start(0);
				te.songs[i].tr2_fx.start(0);
				te.songs[i].tr3_fx.start(0);
			}
			te.songs[0].tr3_fx.onComplete2 = function() { te.songs[0].indicator.setAttribute("rowspan", 2); }
			te.songs[0].tr3_fx.start(0);
			te.songs[0].hideRequestor();
		};
		
		te.sortSongOrder = function() {
			for (var i = 0; i < te.songs.length; i++) {
				te.el.appendChild(te.songs[i].tr1);
				te.el.appendChild(te.songs[i].tr2);
				te.el.appendChild(te.songs[i].tr3);
			}
		};
		
		te.recalculateHeight = function() {
			if (te.showingwinner) {
				te.height = te.header_td.offsetHeight + te.songs[0].song_title.offsetHeight + te.songs[0].album_name.offsetHeight + 5;
			}
			else {
				te.height = te.el.offsetHeight;
			}
		};
	};
	
	that.Extend.TimelineAdSet = function(tas) {
		tas.draw = function() {
			that.drawTimelineTable(tas, _l("adset"), "normal");

			var tr, td, header;
			for (var i = 0; i < tas.p.ad_data.length; i++) {
				tr = createEl("tr", {}, tas.el);
				if (i == 0) {
					header = createEl("td", { "class": "timeline_indicator_normal", "rowspan": tas.p.ad_data.length }, tr);
					createEl("img", { "src": "images/blank.png", "style": "width: 10px; height: 20px;" }, header);
				}
				td = createEl("td", { "class": "timeline_td" }, tr);
				if (tas.p.ad_data[i].ad_url) {
					createEl("a", { "href": tas.p.ad_data[i].ad_url, "textContent": tas.p.ad_data[i].ad_title }, td);
				}
				else {
					createEl("span", { "textContent": tas.p.ad_data[i].ad_title }, td);
				}
			}
			tas.defineFx();
		};
	};
	
	that.Extend.TimelineLiveShow = function(tls) {
		tls.draw = function() {
			that.drawTimelineTable(tls, _l("liveshow"), "normal");
			var tr = createEl("tr", {}, tls.el);
			createEl("td", { "class": "timeline_indicator_normal", "rowspan": 3 }, tr);
			createEl("td", { "class": "timeline_td timeline_live_title", "textContent": tls.p.sched_name }, tr);
			tr = createEl("tr", {}, tls.el);
			createEl("td", { "class": "timeline_td timeline_live_notes", "textContent": tls.p.sched_notes }, tr);
			tr = createEl("tr", {}, tls.el);
			createEl("td", { "class": "timeline_td timeline_live_user", "textContent": tls.p.username }, tr);
			tls.defineFx();
		};
	};
	
	that.Extend.TimelinePlaylist = function(tpl) {
		tpl.draw = function() {
			that.drawTimelineTable(te, _l("playlist"), "normal");
			tpl.defineFx();
		};
	};
	
	that.Extend.TimelineOneShot = function(tos) {
		tos.draw = function() {
			var hltitle = _l("onetimeplay");
			if (tos.p.username) hltitle += _l("from", { "username": tos.p.username } );
			that.drawTimelineTable(tos, hltitle, "normal");
			
			if (tos.p.user_id == user.p.user_id) {
				tos.header_text.textContent = _l("deleteonetime");
				tos.header_text.style.cursor = "pointer";
				tos.header_text.addEventListener("click", tos.deleteOneShot, true);
			}

			tos.defineFx();
		};
		
		tos.drawShowWinner = function() {
			tos.songs[0].tr3_fx.onComplete2 = function() { tos.songs[0].indicator.setAttribute("rowspan", 2); }
			tos.songs[0].tr3_fx.start(0);
		};
	};

	/*****************************************************************************
	TIMELINE SONG
	*****************************************************************************/
	
	that.Extend.TimelineSong = function(ts) {
		var fx_votebkg_x;
		var fx_votebkg_y;
		var votelock_timer;
		var votelock_started;
		var fx_swipe;
		
		ts.draw = function() {
			var indic = "normal";
			if (ts.p.elec_isrequest == 1) indic = "request";
			else if (ts.p.elec_isrequest < 0) indic = "conflict";
			
			ts.tr1 = createEl("tr", {});
			ts.tr1_fx = fx.make(fx.OpacityRemoval, [ ts.tr1, ts.parent.el, 500 ]);
			ts.tr1_fx.set(1);
			ts.indicator = createEl("td", { "class": "timeline_indicator timeline_indicator_" + indic, "rowspan": 3 }, ts.tr1);
			// for indicator_fx check the "if (ts.song_requestor)" block below
			var argh = createEl("img", { "src": "images/blank.png", "class": "timeline_indicator_argh" }, ts.indicator);
			ts.song_td = createEl("td", { "class": "timeline_td timeline_song_td timeline_song_td_" + indic }, ts.tr1);
			ts.vote_hover_el = createEl("div", { "class": "timeline_vote_hover" }, ts.song_td);
			ts.swipe = createEl("div", { "class": "timeline_vote_swipe" }, ts.song_td);
			ts.song_rating_bkg = createEl("div", { "class": "timeline_song_rating_bkg" }, ts.song_td);
			ts.song_rating_c = createEl("div", { "class": "timeline_song_rating_c" }, ts.song_td);
			ts.song_rating = Rating({ category: "song", "id": ts.p.song_id, "userrating": ts.p.song_rating_user, "siterating": ts.p.song_rating_avg, "favourite": ts.p.song_favourite, "register": true });
			ts.song_rating_c.appendChild(ts.song_rating.el);
			ts.song_time = createEl("div", { "class": "timeline_song_time", "textContent": formatTime(ts.p.song_secondslong) }, ts.song_td);
			ts.song_title = createEl("div", { "class": "song_title", "textContent": ts.p.song_title }, ts.song_td);
			
			ts.tr2 = createEl("tr", {});
			ts.tr2_fx = fx.make(fx.OpacityRemoval, [ ts.tr2, ts.parent.el, 500 ]);
			ts.tr2_fx.set(1);
			ts.album_td = createEl("td", { "class": "timeline_td timeline_album_td" }, ts.tr2);
			ts.album_rating_c = createEl("div", { "class": "timeline_song_rating_c" }, ts.album_td);
			ts.album_rating = Rating({ category: "album", "id": ts.p.album_id, "userrating": ts.p.album_rating_user, "siterating": ts.p.album_rating_avg, "favourite": ts.p.album_favourite, "register": true });
			ts.album_rating_c.appendChild(ts.album_rating.el);
			ts.album_rating_bkg = createEl("div", { "class": "timeline_song_rating_bkg" }, ts.album_td);
			if (ts.p.elec_isrequest == 1) {
				ts.song_requestor = createEl("div", { "class": "timeline_song_requestor timeline_song_requestor_request", "textContent": _l("requestedby", { "requester": ts.p.song_requestor }) });
			}
			else if (ts.p.elec_isrequest < 0) {
				ts.song_requestor = createEl("div", { "class": "timeline_song_requestor timeline_song_requestor_conflict", "textContent": _l("conflictswith", { "requester": ts.p.song_requestor }) });
			}
			if (ts.song_requestor) {
				ts.song_requestor_wrap = createEl("div", { "class": "timeline_song_requestor_wrap" }, ts.album_td);
				ts.song_requestor_wrap.appendChild(ts.song_requestor);
				ts.song_requestor.style.height = (ts.album_td.offsetHeight + 1) + "px";
				ts.song_requestor_wrap.style.height = (ts.album_td.offsetHeight + 1) + "px";
				ts.song_requestor_fx = fx.make(fx.CSSNumeric, [ ts.song_requestor, 250, "marginTop", "px" ]);
				ts.song_requestor_fx.height = ts.song_requestor.offsetHeight;
				ts.song_requestor_fx.set(-ts.song_requestor_fx.height);
				ts.indicator_fx = fx.make(fx.BackgroundPosY, [ ts.indicator, 250 ]);
				ts.indicator_fx.set(-22);
				ts.song_requestor_fx.onComplete = function() {
					if (ts.song_requestor_fx.now < -5) ts.album_name.style.zIndex = 10;
				}
			}
			ts.album_name = createEl("div", { "class": "timeline_album_title", "textContent": ts.p.album_name }, ts.album_td);
			
			ts.tr3 = createEl("tr", {});
			ts.tr3_fx = fx.make(fx.OpacityRemoval, [ ts.tr3, ts.parent.el, 500 ]);
			ts.tr3_fx.set(1);
			ts.artist_td = createEl("td", { "class": "timeline_td timeline_artist_td" }, ts.tr3);
			Artist.allArtistToHTML(ts.p.artists, ts.artist_td);
		
			fx_votebkg_x = fx.make(fx.BackgroundPosX, [ ts.song_td, 300 ]);
			fx_votebkg_x.set(-votebkg_width);
			fx_votebkg_y = fx.make(fx.BackgroundPosY, [ ts.song_td, 300 ]);
			fx_votebkg_y.set(0);
			fx_swipe = fx.make(fx.BackgroundPosY, [ ts.swipe, 500 ]);
			fx_swipe.onComplete = ts.endSwipe();
			fx_swipe.set(ts.song_td.offsetHeight);
			
			if (prefs.p.timeline.highlightrequests.value && (ts.p.elec_isrequest != 0)) {
				ts.showRequestor();
			}
		};

		ts.destruct = function() {
			ts.song_rating.destruct();
			ts.album_rating.destruct();
		};

		ts.showVotes = function() {
			if (ts.p.elec_votes > 0) {
				ts.song_time.textContent = ts.p.elec_votes;
			}
			else {
				ts.song_time.textContent = "";
			}
		};

		ts.showSongLength = function() {
			ts.song_time.textContent = formatNumberToMSS(ts.p.song_secondslong);
		};

		ts.voteHoverOn = function(evt) {
			if (!ts.voteinprogress) {
				fx_votebkg_y.set(0);
				fx_votebkg_x.stop();
				fx_votebkg_x.duration = 300;
				fx_votebkg_x.start(-votebkg_width + ts.song_td.offsetWidth + 11);
			}
		};
		
		ts.showRequestor = function() {
			if (ts.song_requestor) {
				ts.song_requestor_fx.start(0);
				ts.indicator_fx.start(-22 + ts.album_td.offsetHeight);
				ts.album_name.style.zIndex = 1;
			}
		};
		
		ts.hideRequestor = function() {
			if (ts.song_requestor) {
				ts.song_requestor_fx.start(-ts.song_requestor_fx.height - 1);
				ts.indicator_fx.start(-22);
			}
		};

		ts.voteHoverOff = function(evt) {
			if (!ts.voteinprogress) {
				fx_votebkg_x.stop();
				fx_votebkg_x.duration = 300;
				fx_votebkg_x.start(-votebkg_width);
			}
		};
		
		ts.voteHoverReset = function() {
			fx_votebkg_y.set(0);
		};

		ts.startVoting = function() {
			fx_votebkg_x.stop();
			fx_votebkg_x.set(-votebkg_width + ts.song_td.offsetWidth + 11);
			fx_votebkg_y.duration = 200;
			fx_votebkg_y.onComplete = ts.startVoting2;
			ts.swipe.style.width = ts.song_td.offsetWidth + "px";
			ts.swipe.style.height = ts.song_td.offsetHeight + "px";
			fx_votebkg_y.start(-25);
			fx_swipe.start(ts.song_td.offsetHeight, -21);
		};
		
		ts.endSwipe = function() {
			ts.swipe.style.width = "0px";
		};
		
		ts.startVoting2 = function() {
			if (!ts.votesubmitted) {
				fx_votebkg_y.onComplete = false;
				fx_votebkg_y.set(-32);
				fx_votebkg_x.set(-votebkg_width);
				votelock_started = clock.hiResTime();
				votelock_timer = setInterval(ts.voteProgress, 20);
			}
		};
		
		ts.voteProgress = function() {
			var clocktime = clock.hiResTime();
			if ((votelock_started + 5000) >= clocktime) {
				var headtime = Math.floor(((votelock_started + 5000) - clocktime) / 100) / 10;
				if ((headtime % 1) == 0) headtime += ".0";
				ts.parent.changeHeadline(_l("votelockingin", { "timeleft": headtime }));
				var x = Math.floor(((clocktime - votelock_started) / 5000) * (ts.song_td.offsetWidth + 11) - votebkg_width);
				fx_votebkg_x.set(x);
			}
			else {
				ts.voteSubmit();
			}
		};

		ts.voteProgressStop = function() {
			clearInterval(votelock_timer);
		};
		
		ts.voteProgressReset = function() {
			fx_votebkg_x.start(-votebkg_width);
		};

		ts.voteProgressComplete = function() {
			fx_votebkg_x.stop();
			fx_votebkg_x.set(-votebkg_width + ts.song_td.offsetWidth + 11);
			fx_votebkg_y.stop();
			fx_votebkg_y.set(-32);
		};

		ts.registerVoteDraw = function() {
			ts.voteProgressComplete();
			fx_votebkg_y.duration = 500;
			fx_votebkg_y.start(-70);
			votelock_timer = false;
		};
		
		return ts;
	};
	
	/*****************************************************************************\
		NOW PLAYING PANEL
	*****************************************************************************/

	that.NPDrawSong = function(json, event, panel) {
		var table = createEl("table", { "class": "nowplaying_table", "cellspacing": 0 });
		
		var tr = createEl("tr", {}, table);
		table.album_art = createEl("td", { "class": "nowplaying_album_art", "rowspan": 4 }, tr);
		if (json && json.album_art) {
			table.album_art_img = createEl("img", { "class": "nowplaying_album_art_img", "src": json.album_art }, table.album_art);
		}
		else {
			if (user.p.sid == 2) table.album_art_img = createEl("img", { "class": "nowplaying_album_art_img", "src": "images/noart_2.jpg" }, table.album_art);			
			else table.album_art_img = createEl("img", { "class": "nowplaying_album_art_img", "src": "images/noart_1.jpg" }, table.album_art);
		}
		table.song_title = createEl("td", { "class": "nowplaying_song_title" }, tr);
		table.song_rating = createEl("td", { "class": "nowplaying_song_rating" }, tr);
		
		tr = createEl("tr", {}, table);
		table.album_name = createEl("td", { "class": "nowplaying_album_name" }, tr);
		table.album_rating = createEl("td", { "class": "nowplaying_album_rating" }, tr);
		
		tr = createEl("tr", {}, table);
		table.artist_name = createEl("td", { "class": "nowplaying_artist_name", "colspan": 2 }, tr);
		
		tr = createEl("tr", {}, table);
		table.url = createEl("td", { "class": "nowplaying_url" }, tr);
		table.votes = createEl("td", { "class": "nowplaying_votes" }, tr);
		
		var urlneedsfill = false;
		if (json) {
			// songs
			if (json.song_title) table.song_title.textContent = json.song_title;
			if (json.album_name) {
				table.album_name.textContent = json.album_name;
				Album.linkify(json.album_id, table.album_name);
			}
			if (typeof(json.song_rating_user) != "undefined") {
				event.song_rating = Rating({ "category": "song", "id": json.song_id, "userrating": json.song_rating_user, "siterating": json.song_rating_avg, "favourite": json.song_favourite, "register": true });
				table.song_rating.appendChild(event.song_rating.el);
			}
			if (typeof(json.album_rating_user) != "undefined") {
				event.album_rating = Rating({ "category": "album", "id": json.album_id, "userrating": json.album_rating_user, "siterating": json.album_rating_avg, "favourite": json.album_favourite, "register": true });
				table.album_rating.appendChild(event.album_rating.el);
			}
			if (json.artists) Artist.allArtistToHTML(json.artists, table.artist_name);
			if (json.song_url && (json.song_url.length > 0)) {
				var urltext = _l("songhomepage");
				if (json.song_urltext && (json.song_urltext.length > 0)) urltext = json.song_urltext;
				else if (user.p.sid == 2) urltext = _l("remixdetails");
				var songlink = createEl("a", { "href": json.song_url, "target": "_blank" }, table.url);
				createEl("span", { "textContent": urltext }, songlink);
				createEl("img", { "src": "images/new_window_icon.png" }, songlink);
				urlneedsfill = false;
			}
			if (json.elec_votes) {
				table.votes.textContent = _l("votes", { "votes": json.elec_votes });
				urlneedsfill = false;
			}
			if (json.elec_isrequest && ((json.elec_isrequest == 1) || (json.elec_isrequest <= -1))) {
				var requestor = json.song_requestor;
				var reqtxt = "";
				if (json.elec_isrequest == 1) reqtxt = _l("requestedby", { "requester": json.song_requestor });
				else if (json.elec_isrequest < 0) reqtxt = _l("conflictedwith", { "requester": json.song_requestor });
				panel.changeReqBy(reqtxt);
			}
			else if (event.p.username && (event.p.sched_type != SCHED_LIVE)) {
				panel.changeReqBy(_l("from", { "username": event.p.username }));
			}
			else if (event.p.sched_dj) {
				panel.changeReqBy(_l("currentdj", { "username": event.p.sched_dj }));
			}
			
			// ads
			if (json.ad_title) table.song_title.textContent = json.ad_title;
			if (json.ad_album) table.album_name.textContent = json.album_name;
			if (json.ad_artist) table.artist_name = json.ad_artist;
			if (json.ad_url && (json.ad_url.length > 0)) createEl("a", { "href": json.ad_url, "textContent": json.ad_url_text }, table.url);

			// generic
			if (json.sched_name) table.song_title.textContent = json.sched_name;
			if (json.sched_notes) table.song_title.textContent = json.sched_notes;
			if (json.username) table.header_right.textContent = json.username;
		}
		
		if (!urlneedsfill) {
			createEl("img", { "src": "images/blank.png", "style": "width: 1px; height: 1px;" }, table.url);
		}
		
		if (table.song_title.textContent > "") {
			table.song_title.setAttribute("class", table.song_title.className + " nowplaying_fadeborder");
			table.song_rating.setAttribute("class", table.song_rating.className + " nowplaying_fadeborder_r");
		}
		if (table.album_name.textContent > "") {
			table.album_name.setAttribute("class", table.album_name.className + " nowplaying_fadeborder");
			table.album_rating.setAttribute("class", table.album_rating.className + " nowplaying_fadeborder_r");
		}
		if (table.artist_name.textContent > "") {
			table.artist_name.setAttribute("class", table.artist_name.className + " nowplaying_fadeborder");
		}
		
		return table;
	};

	that.Extend.NowPanel = function(nowp) {
		nowp.draw = function() {
			nowp.indicator_v = createEl("div", { "class": "nowplaying_indicator_v nowplaying_indicator_v_normal", "textContent": " " }, nowp.container);
			nowp.indicator_h = createEl("div", { "class": "nowplaying_indicator_h nowplaying_indicator_h_normal", "textContent": " " }, nowp.container);
			nowp.header_text = createEl("div", { "class": "nowplaying_header_text" }, nowp.container);
			nowp.header_reqby = createEl("div", { "class": "nowplaying_header_reqby", "textContent": " " }, nowp.container);
			nowp.el = createEl("div", { "class": "nowplaying_wrapper" }, nowp.container);
		};
		
		nowp.changeHeader = function(text) {
			nowp.header_text.textContent = text;
		};
		
		nowp.changeReqBy = function(text) {
			nowp.header_reqby.textContent = text
		};
		
		nowp.changeIsRequest = function(elec_isrequest) {
			if (elec_isrequest == 1) {
				nowp.indicator_v.setAttribute("class", "nowplaying_indicator_v nowplaying_indicator_v_request");
				nowp.indicator_h.setAttribute("class", "nowplaying_indicator_h nowplaying_indicator_h_request");
			}
			else if (elec_isrequest < 0) {
				nowp.indicator_v.setAttribute("class", "nowplaying_indicator_v nowplaying_indicator_v_conflict");
				nowp.indicator_h.setAttribute("class", "nowplaying_indicator_h nowplaying_indicator_h_conflict");
			}
			else {
				nowp.indicator_v.setAttribute("class", "nowplaying_indicator_v nowplaying_indicator_v_normal");
				nowp.indicator_h.setAttribute("class", "nowplaying_indicator_h nowplaying_indicator_h_normal");
			}
		};
	};
	
	that.Extend.NPSkeleton = function(npe) {
		npe.parent.changeReqBy("");
		npe.parent.changeIsRequest(0);
		
		npe.defineFx = function() {
			npe.fx_marginleft = fx.make(fx.CSSNumeric, [ npe.el, 700, "marginLeft", "px" ]);
			npe.fx_marginleft.set(-50);
			npe.fx_opacity = fx.make(fx.OpacityRemoval, [ npe.el, npe.parent.el, 700 ] );
		}
		
		npe.destruct = function() {
			if (npe.song_rating) {
				npe.song_rating.destruct();
				npe.album_rating.destruct();
			}
		};
		
		npe.animateIn = function() {
			npe.fx_marginleft.start(0);
			npe.fx_opacity.start(1);
		};
		
		npe.animateOut = function() {
			npe.fx_marginleft.start(50);
			npe.fx_opacity.start(0);
		};
	};
	
	that.Extend.NPElection = function(npe) {
		npe.draw = function() {
			npe.el = that.NPDrawSong(npe.p.song_data[0], npe, npe.parent);
			npe.defineFx();	
			npe.parent.changeIsRequest(npe.p.song_data[0].elec_isrequest);
		};
	};
	
	that.Extend.NPOneShot = that.Extend.NPElection;
	
	that.Extend.NPLiveShow = function(npl) {
		npl.draw = function() {
			npl.el = that.NPDrawSong(npl.p, npl, npl.parent);
			npl.defineFx();
		};
	};
	
	that.Extend.NPPlaylist = function(npe) {
		npe.draw = function() {
			npe.el = that.NPDrawSong(npe.p.song_data[npe.p.playlist_position], npe, npe.parent);
			npe.defineFx();			
		};
	};
	
	that.Extend.NPAdSet = function(npe) {
		npe.draw = function() {
			npe.el = that.NPDrawSong(npe.p.ad_data[npe.p.adset_position], npe, npe.parent);
			npe.defineFx();
		};
	};

	/*****************************************************************************
	   Menu Panel Styling
	*****************************************************************************/

	that.Extend.MenuPanel = function(menup) {	
		menup.draw = function() {
			// Login Box
			menup.loginbox = createEl("table", { "class": "loginbox", "cellborder": 0, "cellpadding": 0 });
			var row = createEl("tr", {}, menup.loginbox);
			row.appendChild(createEl("td", { "textContent": _l("username"), "style": "padding-right: 1em;" }));
			var td = createEl("td", {}, row);
			menup.login_username = createEl("input", { "type": "text" }, td);
			menup.login_username.addEventListener('keypress', menup.loginBoxKeypress, true);
			var closelogin = createEl("span", { "textContent": "X", "style": "margin-left: 1em; cursor: pointer;" }, td);
			closelogin.addEventListener("click", menup.hideLoginBox, true);

			row = createEl("tr", {}, menup.loginbox);
			row.appendChild(createEl("td", { "textContent": _l("password") }));
			td = createEl("td", {}, row);
			menup.login_password = createEl("input", { "type": "password" }, td);
			menup.login_password.addEventListener('keypress', menup.loginBoxKeypress, true);

			row = createEl("tr", {}, menup.loginbox);
			row.appendChild(createEl("td", { "textContent": _l("autologin") }));
			td = createEl("td", {}, row);
			menup.login_auto = createEl("input", { "type": "checkbox", "checked": "yes" }, td);

			row = createEl("tr", {}, menup.loginbox);
			row.appendChild(createEl("td", { "textContent": "" }));
			td = createEl("td", {}, row);
			menup.login_button = createEl("button", { "textContent": _l("login") }, td);
			menup.login_button.addEventListener('click', menup.loginSubmit, true);

			menup.loginbox.style.position = "absolute";
			menup.loginbox.style.zIndex = "100";
			
			menup.table = createEl("table", { "class": "menu_table", "cellspacing": 0 });
			var row = createEl("tr", {}, menup.table);
			menup.td_station = createEl("td", { "class": "menu_td_station" }, row);
			var morestations = createEl("div", { "class": "menu_select_more" }, menup.td_station);
			_l("menu_morestations", {}, morestations);
			var stationlogo = createEl("img", { "src": "images/menu_logo_" + PRELOADED_SID + ".png" }, menup.td_station);
			menup.ul_select = createEl("ul", { "class": "menu_select", "style": "margin-left: -3px;" });
			menup.li_stations = Array();
			if (PRELOADED_SID != 1) {
				var li = createEl("li", { "style": "cursor: pointer" }, menup.ul_select);
				li.addEventListener("click", function() { menup.changeStation(1); }, true);
				menup.station_rw = createEl("img", { "src": "images/stationselect_1.png" }, li);
			}
			if (PRELOADED_SID != 2) {
				var li = createEl("li", { "style": "cursor: pointer" }, menup.ul_select);
				li.addEventListener("click", function() { menup.changeStation(2); }, true);
				menup.station_rw = createEl("img", { "src": "images/stationselect_2.png" }, li);
			}
			if (PRELOADED_SID != 3) {
				var li = createEl("li", { "style": "cursor: pointer" }, menup.ul_select);
				li.addEventListener("click", function() { menup.changeStation(3); }, true);
				menup.station_rw = createEl("img", { "src": "images/stationselect_3.png" }, li);
			}
			fx.makeMenuDropdown(menup.el, menup.td_station, menup.ul_select);
			
			menup.td_play = createEl("td", { "class": "menu_td_play" }, row);		
			//menup.player = createEl("span", { "class": "menu_player", "style": "cursor: pointer" }, menup.td_play);
			//menup.player.addEventListener("click", menup.playerClick, true);
			menup.player = createEl("a", { "class": "menu_player", "href": "tunein.php", "onclick": "return false;" }, menup.td_play);
			menup.player.addEventListener("click", menup.tuneInClick, true);
			menup.fx_player = fx.make(fx.CSSNumeric, [ menup.player, 250, "opacity", 0 ]);
			menup.fx_player.set(1);
			_l("downloadm3u", false, menup.player);
			
			menup.supportedplayers = createEl("div", { "class": "err_div_ok", "style": "z-index: -1;" });
			_l("players", false, menup.supportedplayers);
			fx.makeMenuDropdown(menup.el, menup.player, menup.supportedplayers);
			
			menup.td_download = createEl("td", { "class": "menu_td_download" }, row);
			var vlca = createEl("a", { "href": "tunein.php", "onclick": "return false;" });
			var vlc = createEl("img", { "src": "images/vlc.png", "class": "link" });
			var fx_vlc = fx.make(fx.CSSNumeric, [ vlc, 250, "opacity", "" ]);
			fx_vlc.set(0.85);
			vlc.addEventListener("click", menup.tuneInClick, true);
			vlc.addEventListener("mouseover", function() { fx_vlc.start(1) }, true);
			vlc.addEventListener("mouseout", function() { fx_vlc.start(0.85) }, true);
			vlca.appendChild(vlc);
			menup.td_download.appendChild(vlca);
			
			var winampa = createEl("a", { "href": "tunein.php", "onclick": "return false;" });
			var winamp = createEl("img", { "src": "images/winamp.png", "class": "link" });
			var fx_winamp = fx.make(fx.CSSNumeric, [ winamp, 250, "opacity", "" ]);
			fx_winamp.set(.85);
			winamp.addEventListener("mouseover", function() { fx_winamp.start(1) }, true);
			winamp.addEventListener("mouseout", function() { fx_winamp.start(0.85) }, true);
			winamp.addEventListener("click", menup.tuneInClick, true);
			winampa.appendChild(winamp);
			menup.td_download.appendChild(winampa);
			
			var fb2ka = createEl("a", { "href": "tunein.php", "onclick": "return false;" });
			var fb2k = createEl("img", { "src": "images/fb2k.png", "class": "link" });
			var fx_fb2k = fx.make(fx.CSSNumeric, [ fb2k, 250, "opacity", "" ]);
			fx_fb2k.set(0.85);
			fb2k.addEventListener("mouseover", function() { fx_fb2k.start(1) }, true);
			fb2k.addEventListener("mouseout", function() { fx_fb2k.start(0.85) }, true);
			fb2k.addEventListener("click", menup.tuneInClick, true);
			fb2ka.appendChild(fb2k);
			menup.td_download.appendChild(fb2ka);
			
			help.changeStepPointEl("tunein", [ menup.player, menup.td_download ]);
			help.changeTopicPointEl("tunein", [ menup.player, menup.td_download ]);
			
			menup.td_news = createEl("td", { "class": "menu_td_news" });
			row.appendChild(menup.td_news);
			
			menup.td_user = createEl("td", { "class": "menu_td_user" });
			menup.avatar = createEl("img", { "class": "menu_avatar", "src": "images/blank.png" });
			menup.td_user.appendChild(menup.avatar);
			menup.username = createEl("span", { "class": "menu_username" });
			menup.loginreg = createEl("span", { "class": "menu_loginreg" });
			var login = createEl("span", { "class": "menu_login", "textContent": _l("login") });
			login.addEventListener("click", menup.showLoginBox, true);
			linkify(login);
			menup.loginreg.appendChild(login);
			menup.loginreg.appendChild(createEl("span", { "textContent": " / " }));
			var reg = createEl("a", { "class": "menu_register", "href": "http://rainwave.cc/forums/ucp.php?mode=register", "textContent": _l("register") });
			linkify(reg);
			menup.loginreg.appendChild(reg);
			menup.td_user.appendChild(menup.loginreg);
			row.appendChild(menup.td_user);
			
			menup.td_chat = createEl("td", { "class": "menu_td_chat" });
			var chatlink = createEl("a", { "class": "link" } );
			chatlink.addEventListener("click", menup.openChat, true);
			_l("chat", {}, chatlink);
			createEl("img", { "src": "images/new_window_icon.png", "style": "height: 12px;" }, chatlink);
			menup.td_chat.appendChild(chatlink);
			row.appendChild(menup.td_chat);
			
			menup.td_forums = createEl("td", { "class": "menu_td_forums" });
			var forumlink = createEl("a", { "target": "_blank", "href": "/forums" });
			_l("forums", {}, forumlink);
			createEl("img", { "src": "images/wikilink_12px.png", "style": "height: 12px;" }, forumlink);
			menup.td_forums.appendChild(forumlink);
			row.appendChild(menup.td_forums);
			
			menup.td_help = createEl("td", { "class": "menu_td_help" });
			var hbutton = createEl("span", { "textContent": _l("help") });
			linkify(hbutton);
			hbutton.addEventListener('click', help.showAllTopics, true);
			menup.td_help.appendChild(hbutton);
			row.appendChild(menup.td_help);
			
			menup.td_cog = createEl("td", { "class": "menu_td_cog" });
			var coglinks = document.createElement("div");
			coglinks.setAttribute("class", "COG_links");
			coglinks.appendChild(createEl("a", { "href": "http://www.colonyofgamers.com", "textContent": "Colony of Gamers" } ));
			coglinks.appendChild(createEl("a", { "href": "http://www.co-optimus.com", "textContent": "Co-Optimus" } ));
			coglinks.appendChild(createEl("a", { "href": "http://www.dipswitchcomics.com", "textContent": "Dipswitch Comics" } ));
			coglinks.appendChild(createEl("a", { "href": "http://www.immortalmachines.com", "textContent": "Immortal Machines" } ));
			coglinks.appendChild(createEl("a", { "href": "http://www.ingamechat.net", "textContent": "In-Game Chat" } ));
			//coglinks.appendChild(createEl("a", { "href": "http://www.johnnygigawatt.com", "textContent": "Johnny Gigawatt" } ));
			coglinks.appendChild(createEl("a", { "href": "http://www.theweeklyrelease.com", "textContent": "The Weekly Release" } ));
			var cogbanner = createEl("img", { "class": "COG_banner", "src": "images/cog_network_h.png" });
			menup.td_cog.appendChild(cogbanner);
			row.appendChild(menup.td_cog);
			fx.makeMenuDropdown(menup.el, cogbanner, coglinks);
			menup.table.appendChild(row);
			menup.el.appendChild(menup.table);
			
			var pos = help.getElPosition(menup.td_user);
			menup.loginbox.style.marginLeft = pos.x + "px";
			
			return;
		};
		
		var showinglogin = false;
		menup.showLoginBox = function() {
			if (showinglogin) {
				menup.hideLoginBox();
			}
			else {
				menup.container.appendChild(menup.loginbox);
				menup.login_username.focus();
				showinglogin = true;
			}
		};
		
		menup.hideLoginBox = function() {
			if (showinglogin) {
				menup.container.removeChild(menup.loginbox);
				showinglogin = false;
			}
		};
		
		menup.drawLoginDisabled = function() {
			menup.login_username.style.background = "#AA0000";
			menup.login_password.style.background = "#AA0000";
			menup.login_button.textContent = _l("disabled");
		};
		
		menup.loginBoxKeypress = function(evt) {
			var code = (evt.keyCode != 0) ? evt.keyCode : evt.charCode;
			if (code == 13) menup.loginSubmit();
		};
		
		menup.loginSubmit = function() {
			menup.doLogin(menup.login_username.value, menup.login_password.value, menup.login_auto.checked);
		};
		
		menup.changeAvatar = function(avatar) {
			menup.avatar.setAttribute("src", avatar);
		};
		
		menup.drawTuneInChange = function(tunedin) {
			/*if (Oggpixel && Oggpixel.playing) {
				menup.player.style.backgroundColor = "#225f8a";
				menup.player.style.cursor = "pointer";
				menup.fx_player.start(1);
				if (tunedin == 1) _l("playing", false, menup.player);
				else _l("waitingforstatus", false, menup.player);
			}
			else if (Oggpixel && (tunedin == -1)) {
				_l("loading", false, menup.player);
			}*/
			if (tunedin == 1) {
				menup.player.style.backgroundColor = "transparent";
				menup.player.style.cursor = "none";
				menup.fx_player.start(.65);
				_l("tunedin", false, menup.player);
			}
			else {
				menup.player.style.backgroundColor = "#225f8a";
				menup.player.style.cursor = "pointer";
				menup.fx_player.start(1);
				//_l("play", false, menup.player);
				_l("downloadm3u", false, menup.player);
			}
		};
		
		menup.showUsername = function(username) {
			menup.username.textContent = username;
			var pnode;
			if (menup.loginreg.parentNode) pnode = menup.loginreg.parentNode;
			else if (menup.username.parentNode) pnode = menup.username.parentNode;
			if (username && menup.loginreg.parentNode) pnode.removeChild(menup.loginreg);
			else if (!username && !menup.loginreg.parentNode) pnode.appendChild(menup.loginreg);
			if (!username && menup.username.parentNode) pnode.removeChild(menup.username);
			else if (username && !menup.username.parentNode) pnode.appendChild(menup.username);
		};
		
		menup.statRestrict = function(restricted) {
			if (restricted) {
				menup.td_news.textContent = _l("log_3", { "lockedto": SHORTSTATIONS[user.p.radio_active_sid], "currentlyon": SHORTSTATIONS[user.p.sid] });
			}
			else {
				menup.td_news.textContent = "";
			}
		};
		
		return menup;
	};
		
	/*****************************************************************************
	   MPI Styling
	*****************************************************************************/

	that.Extend.MainMPI = function(mpi) {
		mpi.postDraw = function() {
			mpi.bkg = document.createElement("div");
			mpi.divSize(mpi.bkg);
			mpi.divPosition(mpi.bkg);
			mpi.bkg.style.zIndex = "1";
			mpi.bkg.style.top = mpi.tabheight + "px";
			mpi.container.appendChild(mpi.bkg);
		};
		
		return mpi;
	};

	that.TabBar = function(container, width) {
		var tabs = {};
		tabs.container = container;
		tabs.width = width;
		tabs.el = createEl("ul", { "class": "tabs" }, container);
		tabs.panels = {};
		
		tabs.addItem = function(panelname, title) {
			tabs.panels[panelname] = {};
			tabs.panels[panelname].focused = false;
			tabs.panels[panelname].enabled = false;
			tabs.panels[panelname].el = createEl("li", { "textContent": title }, tabs.el);
		};
		
		tabs.enableTab = function(panelname, animate) {
			tabs.panels[panelname].enabled = true;
		};

		tabs.focusTab = function(panelname) {
			if (tabs.panels[panelname].focused == true) {
				tabs.panels[panelname].el.setAttribute("class", "tab_focused");
			}
			else {
				tabs.panels[panelname].el.setAttribute("class", "");
			}
		};

		tabs.changeTitle = function(panelname, newtitle) {
			tabs.panels[panelname].el.textContent = newtitle;
		};
		
		return tabs;
	};
	
	/*****************************************************************************
		Playlist Styling
	*****************************************************************************/
	
	that.Extend.PlaylistPanel = function(pp) {
		var tr;
		var listtd;
		var maintd;
		var albumlist;
		var albumlistc;
		var el;
		var inlinesearchc;
		var inlinesearch;
		var keynavscrolloffset = UISCALE * 5;
		var odholder;
		
		pp.draw = function() {
			var leftwidth = UISCALE * 30;
			inlinesearchc = createEl("div", { "class": "pl_searchc" }, pp.container);
			createEl("span", { "textContent": _l("searching") }, inlinesearchc);
			inlinesearch = createEl("span", { "class": "pl_search" }, inlinesearchc);
			albumlistc = createEl("div", { "class": "pl_albumlistc" }, pp.container);
			albumlist = createEl("table", { "class": "pl_albumlist" }, albumlistc);			
			odholder = createEl("div", { "class": "pl_odholder" }, pp.container);
		};
		
		pp.drawAlbumlistEntry = function(album) {
			album.tr = document.createElement("tr");
			album.tr.album_id = album.album_id;

			album.album_rating_user = album.album_rating_user;
			var ratingx = album.album_rating_user * 10;
			album.td_name = document.createElement("td");
			album.td_name.setAttribute("class", "pl_al_name");
			if (ratingx > 0) album.td_name.style.backgroundPosition = "100% " + (-193 + ratingx) + "px";
			else album.td_name.style.backgroundPosition = "100% -200px";
			album.td_name.textContent = album.album_name;
			album.tr.appendChild(album.td_name);
			album.td_name.addEventListener("click", function() { pp.updateKeyNavOffset(album); }, true);
			Album.linkify(album.album_id, album.td_name);
			
			album.td_rating = document.createElement("td");
			album.td_rating.setAttribute("class", "pl_al_rating");
			album.tr.appendChild(album.td_rating);
			
			album.td_fav = document.createElement("td");
			// make sure to attach the album_id to the element that acts as the catch for a fav switch
			album.td_fav.album_id = album.album_id;
			album.td_fav.addEventListener('click', pp.favSwitch, true);
			album.td_fav.setAttribute("class", "pl_fav_" + album.album_favourite);
			
			album.tr.appendChild(album.td_fav);
		};
		
		pp.startSearchDraw = function() {
			albumlistc.style.paddingTop = (UISCALE * 2) + "px";
			inlinesearch.textContent = "";
			inlinesearchc.style.display = "block";
		};
		
		pp.drawSearchString = function(string) {
			inlinesearch.textContent = string;
			albumlistc.scrollTop = 0;
		};
		
		pp.setRowClass = function(album, highlight, open) {
			var cl = album.album_available ? "pl_available" : "pl_cooldown";
			if (highlight) cl += " pl_highlight";
			if (open || ((album.album_id == pp.currentidopen) && !open)) cl += " pl_albumopen";
			album.tr.setAttribute("class", cl);
		}
		
		pp.insertBefore = function(album1, album2) {
			if (album2.tr.parentNode) albumlist.insertBefore(album1.tr, album2.tr);
		};
		
		pp.appendChild = function(album) {
			if (!album.tr.parentNode) albumlist.appendChild(album.tr);
		};
		
		pp.removeChild = function(album) {
			if (album.tr.parentNode) albumlist.removeChild(album.tr);
		};
		
		pp.hideChild = function(album) {
			album.tr.style.display = "none";
		};
		
		pp.unhideChild = function(album) {
			album.tr.style.display = "";
		};
		
		pp.appendOpenDiv = function(div) {
			odholder.appendChild(div);
		};
		
		pp.removeOpenDiv = function(div) {
			odholder.removeChild(div);
		};
		
		pp.ratingResultDraw = function(album, result) {
			album.album_rating_user = result.album_rating;
			var ratingx = album.album_rating_user * 10;
			album.td_name.style.backgroundPosition = "100% " + (-193 + ratingx) + "px";
			album.td_rating.textContent = album.album_rating_user.toFixed(1);
		};
		
		pp.favResultDraw = function(album, favourite) {
			album.td_fav.setAttribute("class", "pl_fav_" + favourite);
		};
		
		pp.updateKeyNavOffset = function(album) {
			pp.setKeyNavOffset(album.tr.offsetTop - albumlistc.scrollTop);
		};
		
		pp.setKeyNavOffset = function(offset) {
			if (offset && (offset > UISCALE * 5)) {
				keynavscrolloffset = offset;
			}
			else {
				keynavscrolloffset = UISCALE * 5;
			}
		}
		
		pp.scrollToAlbum = function(album) {
			if (album) {
				albumlistc.scrollTop = album.tr.offsetTop - keynavscrolloffset;
			}
		};
		
		pp.clearInlineSearchDraw = function() {
			inlinesearchc.style.display = "none";
			albumlistc.style.paddingTop = "0px";
		};
	
		pp.drawAlbum = function(div, json) {
			div.hdrtable = document.createElement("table");
			div.hdrtable.style.width = "100%";
			div.hdrtable.setAttribute("cellspacing", "0");
			
			var tr = document.createElement("tr");
			div.albumnametd = document.createElement("td");
			div.albumnametd.setAttribute("class", "pl_ad_albumnametd");
			div.albumnametd.setAttribute("colspan", 2);
			
			div.albumrating = Rating({ category: "album", id: json.album_id, userrating: json.album_rating_user, siterating: json.album_rating_avg, favourite: json.album_favourite, scale: 1.2, register: true });
			div.albumnametd.appendChild(div.albumrating.el);
			
			div.albumname = document.createElement("div");
			div.albumname.setAttribute("class", "pl_ad_albumname");
			div.albumname.textContent = json.album_name;
			div.albumnametd.appendChild(div.albumname);
			
			tr.appendChild(div.albumnametd);
			div.hdrtable.appendChild(tr);
			tr = document.createElement("tr");
			
			div.albumdetailtd = document.createElement("td");
			div.albumdetailtd.setAttribute("class", "pl_ad_albumdetailtd");
			
			if ((json.album_rating_count >= 10) && svg.capable) {
				var gr = graph.makeSVG(graph.RatingHistogram, that.RatingHistogramMask, 200, 120 - (UISCALE * 3), { maxx: 5, stepdeltax: 0.5, stepsy: 3, xprecision: 1, xnumbermod: 1, xnomin: true, ynomin: true, minx: 0.5, miny: 0, padx: 10, raw: json.album_rating_histogram });
				gr.svg.setAttribute("class", "pl_ad_ratinghisto");
				div.albumdetailtd.appendChild(gr.svg);
			}
			
			var stats = document.createElement("div");
			var tmp = document.createElement("div");
			if (json.album_lowest_oa > clock.now) _l("pl_oncooldown", { "time": formatHumanTime(json.album_lowest_oa - clock.now, true, true) }, tmp);
			stats.appendChild(tmp);
			tmp = document.createElement("div");
			_l("pl_ranks", { "rating": json.album_rating_avg.toFixed(1), "rank": json.album_rating_rank }, tmp);
			stats.appendChild(tmp);
			if (json.album_fav_count > 0) {
				tmp = document.createElement("div");
				_l("pl_favourited", { "count": json.album_fav_count }, tmp);
				stats.appendChild(tmp);
			}
			if ((json.album_timeswon > 0) && (json.album_timesdefeated > 0)) {
				tmp = document.createElement("div");
				_l("pl_wins", { "percent": ((json.album_timeswon / (json.album_timeswon + json.album_timesdefeated)) * 100).toFixed(1) }, tmp);
				stats.appendChild(tmp);
			}
			if (json.album_totalrequests > 0) {
				tmp = document.createElement("div");
				_l("pl_requested", { "count": json.album_totalrequests, "rank": json.album_request_rank }, tmp);
				stats.appendChild(tmp);
			}
			if (json.album_genres.length == 1) {
				tmp = document.createElement("div");
				_l("pl_genre", false, tmp, true);
				createEl("span", { "textContent": json.album_genres[0].genre_name + _l("pl_genre2") }, tmp);
				stats.appendChild(tmp);
			}
			else if (json.album_genres.length > 1) {
				tmp = document.createElement("div");
				_l("pl_genres", {}, tmp);
				var span = createEl("span", {}, tmp);
				var maxgenres = json.album_genres.length;
				var maxhit = false;
				if (json.album_genres.length > 3) {
					maxgenres = 3;
					maxhit = true;
				}
				for (var g = 0; g < maxgenres; g++) {
					if (g > 0) span.textContent += ", ";
					span.textContent += json.album_genres[g].genre_name;
				}
				if (!maxhit) _l("pl_genres2_normal", false, tmp, true);
				else _l("pl_genres2_more", false, tmp, true);
				stats.appendChild(tmp);
			}
			div.albumdetailtd.appendChild(stats);
			tr.appendChild(div.albumdetailtd);
			
			div.albumarttd = createEl("td", { "class": "pl_ad_albumart_td" }, tr);
			if (json.album_art) {
				createEl("img", { "src": json.album_art, "class": "pl_ad_albumart" }, div.albumarttd);
			}
			else {
				if (user.p.sid == 2) createEl("img", { "src": "images/noart_2.jpg", "class": "pl_ad_albumart" }, div.albumarttd);
				else createEl("img", { "src": "images/noart_1.jpg", "class": "pl_ad_albumart" }, div.albumarttd);
			}
			
			div.hdrtable.appendChild(tr);
			div.appendChild(div.hdrtable);
			
			div.songlist = document.createElement("table");
			div.songlist.setAttribute("class", "pl_songlist");
			div.songlist.style.clear = "both";
			div.songarray = [];
			that.drawAlbumTable(div.songlist, div.songarray, json.song_data);
			
			div.updateHelp = function() {
				if (div.songarray.length > 0) {
					help.changeStepPointEl("clicktorequest", [ div.songarray[0].td_r ]);
				}
			};
			
			div.appendChild(div.songlist);
		};
		
		pp.destruct = function(div) {
			div.div.albumrating.destruct();
			for (var i = 0; i < div.div.songarray.length; i++) {
				div.div.songarray[i].rating.destruct();
			}
		};
	};
	
	// Pass a table already created, an empty array, and JSON song_data in
	that.drawAlbumTable = function(table, songarray, song_data) {
		var ns;
		var trclass;
		for (var i = 0; i < song_data.length; i++) {
				ns = {};
				ns.tr = document.createElement("tr");
				trclass = song_data[i].song_available ? "pl_songlist_tr_available" : "pl_songlist_tr_unavailable";
				ns.tr.setAttribute("class", trclass);
				
				ns.td_r = document.createElement("td");
				ns.td_r.setAttribute("class", "pl_songlist_r");
				ns.td_r.textContent = "R";
				Request.linkify(song_data[i].song_id, ns.td_r);
				ns.tr.appendChild(ns.td_r);
				
				ns.td_n = document.createElement("td");
				ns.td_n.setAttribute("class", "pl_songlist_title");
				ns.td_n.textContent = song_data[i].song_title;
				ns.tr.appendChild(ns.td_n);
				
				ns.td_a = document.createElement("td");
				ns.td_a.setAttribute("class", "pl_songlist_artists");
				Artist.allArtistToHTML(song_data[i].artists, ns.td_a);
				ns.tr.appendChild(ns.td_a);
				
				ns.td_rating = document.createElement("td");
				ns.td_rating.setAttribute("class", "pl_songlist_rating");
				ns.td_rating.style.width = (that.Rating_width + 5) + "px";
				ns.rating = Rating({ category: "song", id: song_data[i].song_id, userrating: song_data[i].song_rating_user, x: 0, y: 1, siterating: song_data[i].song_rating_avg, favourite: song_data[i].song_favourite, register: true });
				ns.td_rating.appendChild(ns.rating.el);
				ns.tr.appendChild(ns.td_rating);
				
				ns.td_length = document.createElement("td");
				ns.td_length.setAttribute("class", "pl_songlist_length");
				ns.td_length.textContent = formatTime(song_data[i].song_secondslong);
				ns.tr.appendChild(ns.td_length);
				
				ns.td_cooldown = document.createElement("td");
				ns.td_cooldown.setAttribute("class", "pl_songlist_cooldown");
				if (!song_data[i].song_available && (song_data[i].song_releasetime > clock.now)) {
					ns.td_cooldown.textContent = formatHumanTime(song_data[i].song_releasetime - clock.now);
				}
				else {
					ns.td_cooldown.textContent = " ";
				}
				ns.tr.appendChild(ns.td_cooldown);
				
				if (song_data[i].song_id && (user.p.radio_live_admin > 0)) {
					ns.td_oneshot = document.createElement("td");
					ns.td_oneshot.setAttribute("class", "pl_songlist_oneshot");
					ns.td_oneshot.textContent = "Play";
					Song.linkifyAsOneshot(song_data[i].song_id, ns.td_oneshot);
					ns.tr.appendChild(ns.td_oneshot);
					
					/*ns.td_fc = document.createElement("td");
					ns.td_fc.setAttribute("class", "pl_songlist_forcecandidate");
					ns.td_fc.textContent = "Cand";
					Song.linkifyAsForceCandidate(song_data[i].song_id, ns.td_fc);
					ns.tr.appendChild(ns.td_fc);*/
				}
				
				table.appendChild(ns.tr);
				songarray.push(ns);
			}
	};	
	
	// /*****************************************************************************
	// Error Skinning
	// *****************************************************************************/
	
	that.Extend.ErrorControl = function(ec) {
		ec.drawError = function(obj, code, overridetext) {
			obj.code = code;
			
			if (obj.permanent) {
				obj.xbutton = document.createElement("span");
				obj.xbutton.addEventListener("click", function() { ec.clearError(code); }, true);
				obj.xbutton.setAttribute("class", "err_button");
				obj.xbutton.textContent = "[X] ";
				obj.el.appendChild(obj.xbutton);
			}
			
			obj.text = document.createElement("span");
			
			if (!overridetext) _l("log_" + code, false, obj.text);
			else obj.text.textContent = overridetext;
			obj.el.appendChild(obj.text);
			
			obj.fx_opacity = fx.make(fx.CSSNumeric, [ obj.el, 250, "opacity", "" ]);
			obj.fx_opacity.set(0);
			
			document.getElementById("body").appendChild(obj.el);
			obj.fx_opacity.start(1);
		};
		
		ec.unshowError = function(obj) {
			obj.fx_opacity.stop();
			obj.fx_opacity.onComplete = function() { ec.deleteError(obj); };
			obj.fx_opacity.start(0);
		};
		
		return ec;
	};
	
	// /*****************************************************************************
	// GRAPH MASKING FUNCTIONS
	// *****************************************************************************/
	
	that.graphDefs = function(svgel, defs) {
		var usergradient = svg.makeGradient("linear", "Rating_usergradient", "0%", "0%", "0%", "100%", "pad");
		usergradient.appendChild(svg.makeStop("15%", "#b9e0ff", "1"));
		usergradient.appendChild(svg.makeStop("50%", "#8bccff", "1"));
		usergradient.appendChild(svg.makeStop("85%", "#8bccff", "1"));
		usergradient.appendChild(svg.makeStop("100%", "#76add8", "1"));
		defs.appendChild(usergradient);
	};
	
	that.RatingHistogramMask = function(graph, mask) {
		mask.appendChild(svg.makeRect(0, 0, graph.width, graph.height, { fill: "url(#Rating_usergradient)" }));
	};	
	
	return that;
};