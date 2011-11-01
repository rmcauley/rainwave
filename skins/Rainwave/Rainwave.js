function _THEME() {
	var that = {};
	var skindir = "skins_r" + BUILDNUM + "/Rainwave";

	// These are variables that Edi or the graphing engine depends upon
	that.borderheight = 12;
	that.borderwidth = 12;
	that.textcolor = "#FFFFFF";
	that.vdarktext = "#777777";
	that.helplinecolor = "#c287ff";
	that.helptextcolor = "#d6afff";

	// Internal variables
	var votebkg_width = 680;
	that.Rating_width = 130;
	
	that.Extend = {};
	
	/*****************************************************************************
	  RATING EFFECTS (not required by Edi)
	*****************************************************************************/
	
	fx.extend("UserRating", function(object) {
		var urfx = {};
		urfx.update = function(now) {
			var px = Math.round(now * 10);
			if (px <= 16) object.user_on.style.width = px + "px";
			else object.user_on.style.width = "16px";
			if (px >= 8) object.user_bar.style.backgroundPosition = (px - 50) + "px 0px";
			else object.user_bar.style.backgroundPosition = "-50px 0px";
			var text = (Math.round(now * 10) / 10).toFixed(1);
			if (text == "0.0") text = "";
			object.user_text.textContent = text;
		};
			
		return urfx;
	});
	
	fx.extend("SiteRating", function(object) {
		var srfx = {};
		srfx.update = function(now) {
			var px = Math.round(now * 10);
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
			
			fx_user = fx.make(fx.UserRating, ro, 250);
			fx_site = fx.make(fx.SiteRating, ro, 250);
			fx_fav = fx.make(fx.CSSNumeric, ro.fav, 250, "opacity", "");
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
	
	var timeline_elec_fullheight = false;
	var timeline_elec_winnerheight = false;
	var timeline_elec_slimheight = false;
	
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
			te.leftfx.set(-te.parent.width);
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
			if (!te.songs) {
				te.height = te.el.offsetHeight;
			}
			else if (te.showingwinner && te.showingheader) {
				if (!timeline_elec_winnerheight) {
					timeline_elec_winnerheight = te.header_td.offsetHeight + te.songs[0].song_title.offsetHeight + te.songs[0].album_name.offsetHeight + 5;
				}
				te.height = timeline_elec_winnerheight;
			}
			else if (te.showingwinner) {
				if (!timeline_elec_slimheight) {
					timeline_elec_slimheight = te.songs[0].song_title.offsetHeight + te.songs[0].album_name.offsetHeight + 5;
				}
				te.height = timeline_elec_slimheight;
			}
			else if (te.sched_type == 0) {
				if (!timeline_elec_fullheight) {
					timeline_elec_fullheight = te.el.offsetHeight;
				}
				te.height = timeline_elec_fullheight;
			}
			else {
				te.height = te.el.offsetHeight;
			}
		};
		
		te.defineFx = function() {
			te.topfx = fx.make(fx.CSSNumeric, te.el, 700, "top", "px");
			te.topfx.set(-200);
			te.leftfx = fx.make(fx.CSSTranslateX, te.el, 700);
			te.leftfx.set(0);
			te.opacityfx = fx.make(fx.CSSNumeric, te.el, 700, "opacity", "");
			te.opacityfx.set(1);
		};
		
		te.sortSongOrder = function() {};
		
		te.emphasizeWinner = function() {};
		
		te.changeOpacity = function(to) {
			te.opacityfx.set(to);
		};
		
		te.drawShowWinner = function() {
			if (!te.songs) return;
			for (var i = 1; i < te.songs.length; i++) {
				te.songs[i].tr1_fx.start(0);
				te.songs[i].tr2_fx.start(0);
				te.songs[i].tr3_fx.start(0);
			}
			if (te.songs.length > 0) {
				te.songs[0].tr3_fx.onComplete2 = function() { te.songs[0].indicator.setAttribute("rowspan", 2); }
				te.songs[0].tr3_fx.start(0);
				te.songs[0].hideRequestor();
			}
		};
	}
	
	that.Extend.TimelineElection = function(te) {
		te.draw = function() {
			var reqstatus = 0;
			for (var i = 0; i < te.p.song_data.length; i++) {
				if (te.p.song_data[i].elec_isrequest > ELECSONGTYPES.normal) {
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
		
		te.sortSongOrder = function() {
			for (var i = 0; i < te.songs.length; i++) {
				te.el.appendChild(te.songs[i].tr1);
				te.el.appendChild(te.songs[i].tr2);
				te.el.appendChild(te.songs[i].tr3);
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
					createEl("a", { "href": tas.p.ad_data[i].ad_url, "textContent": tas.p.ad_data[i].ad_title, "class": "link" }, td);
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
	};

	/*****************************************************************************
	TIMELINE SONG
	*****************************************************************************/
	
	var timeline_elec_tdheight = false;
	
	that.Extend.TimelineSong = function(ts) {
		var fx_votebkg_x;
		var fx_votebkg_y;
		var votelock_timer;
		var votelock_started;
		var fx_swipe;
		
		ts.draw = function() {
			var indic = "normal";
			if (ts.p.elec_isrequest > ELECSONGTYPES.normal) indic = "request";
			else if (ts.p.elec_isrequest < ELECSONGTYPES.normal) indic = "conflict";
			
			ts.tr1 = createEl("tr", {});
			ts.tr1_fx = fx.make(fx.OpacityRemoval, ts.tr1, 500, ts.parent.el);
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
			ts.tr2_fx = fx.make(fx.OpacityRemoval, ts.tr2, 500, ts.parent.el);
			var albumclasses = "timeline_td timeline_album_td";
			if (ts.p.elec_isrequest > ELECSONGTYPES.normal) {
				albumclasses += " timeline_album_td_request";
			}
			else {
				albumclasses += " timeline_album_td_conflict";
			}
			ts.album_td = createEl("td", { "class": albumclasses }, ts.tr2);
			ts.album_rating_c = createEl("div", { "class": "timeline_song_rating_c" }, ts.album_td);
			ts.album_rating = Rating({ category: "album", "id": ts.p.album_id, "userrating": ts.p.album_rating_user, "siterating": ts.p.album_rating_avg, "favourite": ts.p.album_favourite, "register": true });
			ts.album_rating_c.appendChild(ts.album_rating.el);
			ts.album_rating_bkg = createEl("div", { "class": "timeline_song_rating_bkg" }, ts.album_td);
			if (ts.p.elec_isrequest > ELECSONGTYPES.normal) {
				ts.song_requestor = createEl("div", { "class": "timeline_song_requestor", "textContent": _l("requestedby", { "requester": ts.p.song_requestor }) });
			}
			else if (ts.p.elec_isrequest < ELECSONGTYPES.normal) {
				ts.song_requestor = createEl("div", { "class": "timeline_song_requestor", "textContent": _l("conflictswith", { "requester": ts.p.song_requestor }) });
			}
			if (ts.song_requestor) {
				ts.song_requestor_wrap = createEl("div", { "class": "timeline_song_requestor_wrap" }, ts.album_td);
				ts.song_requestor_wrap.appendChild(ts.song_requestor);
				ts.song_requestor_fx = fx.make(fx.CSSNumeric, ts.song_requestor, 250, "marginTop", "px");
				ts.song_requestor_bkg_fx = fx.make(fx.BackgroundPosY, ts.album_td, 250);
				ts.song_requestor_bkg_fx.set(-90);
				ts.indicator_fx = fx.make(fx.BackgroundPosY, ts.indicator, 250);
				ts.indicator_fx.set(-21);
				ts.song_requestor_fx.onComplete = function(now) {
					if (now < -5) ts.album_name.style.zIndex = 10;
				}
			}
			ts.album_name = createEl("div", { "class": "timeline_album_title", "textContent": ts.p.album_name }, ts.album_td);
			if (ts.song_requestor) {
				ts.album_name_fx = fx.make(fx.CSSNumeric, ts.album_name, 250, "opacity");
				ts.album_name_fx.set(1);
			}
			
			ts.tr3 = createEl("tr", {});
			ts.tr3_fx = fx.make(fx.OpacityRemoval, ts.tr3, 500, ts.parent.el);
			ts.artist_td = createEl("td", { "class": "timeline_td timeline_artist_td" }, ts.tr3);
			Artist.allArtistToHTML(ts.p.artists, ts.artist_td);
		
			fx_votebkg_x = fx.make(fx.BackgroundPosX, ts.song_td, 300);
			fx_votebkg_x.set(-votebkg_width);
			fx_votebkg_y = fx.make(fx.BackgroundPosY, ts.song_td, 300);
			fx_votebkg_y.set(0);
			fx_swipe = fx.make(fx.BackgroundPosY, ts.swipe, 500);
			fx_swipe.onComplete = ts.endSwipe();
			
			ts.tr1_fx.set(1);
			ts.tr2_fx.set(1);
			ts.tr3_fx.set(1);
			
			if (!timeline_elec_tdheight) {
				timeline_elec_tdheight = ts.album_td.offsetHeight;
			}
			
			if (ts.song_requestor) {
				ts.song_requestor.style.height = timeline_elec_tdheight + "px";
				ts.song_requestor_wrap.style.height = timeline_elec_tdheight + "px";
				ts.song_requestor_fx.height = timeline_elec_tdheight;
				ts.song_requestor_fx.set(-timeline_elec_tdheight);
				if (prefs.p.timeline.highlightrequests.value) {
					ts.showRequestor();
				}
			}
			
			fx_swipe.set(timeline_elec_tdheight);
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
				fx_votebkg_x.duration = 450;
				var vhx = -votebkg_width + ts.parent.parent.width + 11;
				if (vhx > 0) vhx = 0;
				fx_votebkg_x.start(vhx);
			}
		};
		
		ts.showRequestor = function() {
			if (ts.song_requestor) {
				ts.song_requestor_fx.start(0);
				ts.indicator_fx.start(-21 + timeline_elec_tdheight);
				ts.album_name_fx.start(0);
				ts.song_requestor_bkg_fx.start(-90 + timeline_elec_tdheight);
				//ts.album_name.style.zIndex = 1;
			}
		};
		
		ts.hideRequestor = function() {
			if (ts.song_requestor) {
				ts.song_requestor_fx.start(-timeline_elec_tdheight);
				ts.indicator_fx.start(-21);
				ts.album_name_fx.start(1);
				ts.song_requestor_bkg_fx.start(-90);
			}
		};

		ts.voteHoverOff = function(evt) {
			if (!ts.voteinprogress) {
				fx_votebkg_x.stop();
				fx_votebkg_x.duration = 450;
				fx_votebkg_x.start(-votebkg_width);
			}
		};
		
		ts.voteHoverReset = function() {
			fx_votebkg_y.set(0);
		};

		ts.startVoting = function() {
			fx_votebkg_x.stop();
			fx_votebkg_x.set(-votebkg_width + ts.parent.parent.width + 11);
			fx_votebkg_y.duration = 300;
			fx_votebkg_y.onComplete = ts.startVoting2;
			ts.swipe.style.width = ts.parent.parent.width + "px";
			ts.swipe.style.height = timeline_elec_tdheight + "px";
			fx_votebkg_y.start(-25);
			fx_swipe.start(timeline_elec_tdheight, -21);
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
				var x = Math.floor(((clocktime - votelock_started) / 5000) * (ts.parent.parent.width + 11) - votebkg_width);
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
			fx_votebkg_x.set(0);
			fx_votebkg_y.stop();
			fx_votebkg_y.set(-32);
		};

		ts.registerVoteDraw = function() {
			ts.voteProgressComplete();
			fx_votebkg_y.duration = 800;
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
			table.album_art_img = createEl("img", { "class": "nowplaying_album_art_img", "src": PRELOADED_LYREURL + json.album_art }, table.album_art);
		}
		else {
			if (user.p.sid == 2) table.album_art_img = createEl("img", { "class": "nowplaying_album_art_img", "src": skindir + "/images/noart_2.jpg" }, table.album_art);			
			else table.album_art_img = createEl("img", { "class": "nowplaying_album_art_img", "src": skindir + "/images/noart_1.jpg" }, table.album_art);
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
			if (json.song_rating_sid && (json.song_rating_sid != user.p.sid)) {
				table.className = "nowplaying_table nowplaying_station_" + json.song_rating_sid;
			}
			if (json.song_title) {
				table.song_title_text = createEl("div", { "textContent": json.song_title }, table.song_title);
			}
			if (json.album_name) {
				table.album_name_text = createEl("div", { "textContent": json.album_name }, table.album_name);
				Album.linkify(json.album_id, table.album_name_text);
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
				var songlink = createEl("a", { "href": json.song_url, "target": "_blank", "class": "link" }, table.url);
				createEl("span", { "textContent": urltext }, songlink);
				urlneedsfill = false;
			}
			if (json.elec_votes) {
				table.votes.textContent = _l("votes", { "votes": json.elec_votes });
				urlneedsfill = false;
			}
			if (json.elec_isrequest && ((json.elec_isrequest > ELECSONGTYPES.normal) || (json.elec_isrequest < ELECSONGTYPES.normal))) {
				var requestor = json.song_requestor;
				var reqtxt = "";
				if (json.elec_isrequest > ELECSONGTYPES.normal) reqtxt = _l("requestedby", { "requester": json.song_requestor });
				else if (json.elec_isrequest < ELECSONGTYPES.normal) reqtxt = _l("conflictedwith", { "requester": json.song_requestor });
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
			if (json.ad_url && (json.ad_url.length > 0)) createEl("a", { "href": json.ad_url, "textContent": json.ad_url_text, "class": "link" }, table.url);

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
			if (elec_isrequest > ELECSONGTYPES.normal) {
				nowp.indicator_v.setAttribute("class", "nowplaying_indicator_v nowplaying_indicator_v_request");
				nowp.indicator_h.setAttribute("class", "nowplaying_indicator_h nowplaying_indicator_h_request");
			}
			else if (elec_isrequest < ELECSONGTYPES.normal) {
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
		npe.parent.changeIsRequest(ELECSONGTYPES.normal);
		
		npe.defineFx = function() {
			npe.fx_marginleft = fx.make(fx.CSSTranslateX, npe.el, 700);
			npe.fx_marginleft.set(-50);
			npe.fx_opacity = fx.make(fx.OpacityRemoval, npe.el, 700, npe.parent.el);
		}
		
		npe.animateIn = function() {
			npe.fx_marginleft.start(10);
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
		var flashloaded = false;
		var removedflash = false;
		
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
			menup.td_station = createEl("td", { "class": "menu_td_rainwave" }, row);
			var menuorder = [ 5, 1, 4, 3, 2 ];
			var classname, station;
			for (var i = 0; i < menuorder.length; i++) {
				classname = "menu_td_station menu_td_station_" + menuorder[i];
				if (menuorder[i] == PRELOADED_SID) classname += "_on";
				station = createEl("td", { "class": classname }, row);
				if (menuorder[i] == 1)	station.addEventListener("click", function() { menup.changeStation(1); }, true);
				else if (menuorder[i] == 2) station.addEventListener("click", function() { menup.changeStation(2); }, true);
				else if (menuorder[i] == 3) station.addEventListener("click", function() { menup.changeStation(3); }, true);
				else if (menuorder[i] == 4) station.addEventListener("click", function() { menup.changeStation(4); }, true);
				else if (menuorder[i] == 5) station.addEventListener("click", function() { menup.changeStation(5); }, true);
			}
			
			menup.td_play = createEl("td", { "class": "menu_td_play menu_td_play_tunedout" }, row);
			menup.fx_play_width = fx.make(fx.CSSNumeric, menup.td_play, 250, "width", "px");
			menup.fx_play_width.set(84);
			
			menup.m3u_download = createEl("div", { "class": "menu_download" }, menup.td_play);
			//menup.or_use = createEl("span", { "textContent": _l("oruse") }, menup.m3u_download);
			var wmpa = createEl("a", { "href": "tunein.php", "onclick": "return false;", "class": "tunein_wmp" }, menup.m3u_download);
			createEl("img", { "width": 16, "height": 16, "src": "images/blank.png" }, wmpa);
			wmpa.addEventListener("click", menup.tuneInClickMP3, true);
			var itunesa = createEl("a", { "href": "tunein.php", "onclick": "return false;", "class": "tunein_itunes" }, menup.m3u_download);
			createEl("img", { "width": 16, "height": 16, "src": "images/blank.png" }, itunesa);
			itunesa.addEventListener("click", menup.tuneInClickMP3, true);
			var vlca = createEl("a", { "href": "tunein.php?ogg=true", "onclick": "return false;", "class": "tunein_vlc" }, menup.m3u_download);
			createEl("img", { "width": 16, "height": 16, "src": "images/blank.png" }, vlca);
			vlca.addEventListener("click", menup.tuneInClickOgg, true);
			var winampa = createEl("a", { "href": "tunein.php?ogg=true", "onclick": "return false;", "class": "tunein_winamp" }, menup.m3u_download);
			createEl("img", { "width": 16, "height": 16, "src": "images/blank.png" }, winampa);
			winampa.addEventListener("click", menup.tuneInClickOgg, true);
			var fb2ka = createEl("a", { "href": "tunein.php?ogg=true", "onclick": "return false;", "class": "tunein_fb2k" }, menup.m3u_download);
			createEl("img", { "width": 16, "height": 16, "src": "images/blank.png" }, fb2ka);
			fb2ka.addEventListener("click", menup.tuneInClickOgg, true);
			var m3u_download_width = fx.make(fx.CSSNumeric, menup.m3u_download, 250, "width", "px");
			m3u_download_width.set(0);
			
			menup.td_play.addEventListener("mouseover", function() {
					m3u_download_width.start(135);
					menup.fx_play_width.start(220);
				}, true);
			menup.td_play.addEventListener("mouseout", function() {
					m3u_download_width.start(0);
					menup.fx_play_width.start(84);
				}, true);
			
			menup.player = createEl("div", { "class": "menu_player menu_player_flash", "id": "flash_player" }, menup.td_play);
			menup.flash_container = menup.player;
			menup.flash_warning = createEl("div", { "class": "menu_flash_warning" }, menup.player);
			var flash_warning_opacity = fx.make(fx.CSSNumeric, menup.flash_warning, 150, "opacity");
			menup.flash_warning.addEventListener("click", menup.playerClick, true);
			menup.flash_warning.addEventListener("mouseover", function() { flash_warning_opacity.start(1); }, true);
			menup.flash_warning.addEventListener("mouseout", function() { flash_warning_opacity.start(0); }, true);
			flash_warning_opacity.set(0);
			
			help.changeStepPointEl("tunein", [ menup.player, menup.td_download ]);
			help.changeTopicPointEl("tunein", [ menup.player, menup.td_download ]);
			
			menup.td_news = createEl("td", { "class": "menu_td_news" }, row);
			menup.ticker_overflow = createEl("div", { "class": "menu_ticker_overflow" }, menup.td_news);
			menup.ticker = createEl("div", { "class": "menu_ticker" }, menup.ticker_overflow);
			ticker.el = menup.ticker;
			
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
			var reg = createEl("a", { "class": "menu_register", "href": "http://rainwave.cc/forums/ucp.php?mode=register", "textContent": _l("register"), "class": "link" });
			linkify(reg);
			menup.loginreg.appendChild(reg);
			menup.td_user.appendChild(menup.loginreg);
			row.appendChild(menup.td_user);
			
			menup.user_cp = createEl("div", { "class": "menu_user_cp menu_dropdown" });
			//var usercp_logout = createEl("a", { "class": "displayblock", "textContent": _l("logout"), "href": "http://rainwave.cc/forums/ucp.php?mode=logout" }, menup.user_cp);
			var usercp_keys = createEl("a", { "class": "displayblock", "textContent": _l("managekeys"), "href": "http://rainwave.cc/auth/", "class": "link" }, menup.user_cp);
			//var usercp_profile = createEl("span", { "class": "displayblock", "textContent": _l("listenerprofile") }, menup.user_cp);
			Username.linkify(user.p.user_id, menup.username);
			fx.makeMenuDropdown(menup.el, menup.td_user, menup.user_cp, { "checkbefore": function() { if (user.p.user_id == 1) return false; else return true; } } );
			
			menup.td_chat = createEl("td", { "class": "menu_td_chat" });
			var chatlink = createEl("a");
			linkify(chatlink, false, true);
			chatlink.addEventListener("click", menup.openChat, true);
			_l("chat", {}, chatlink);
			menup.td_chat.appendChild(chatlink);
			row.appendChild(menup.td_chat);
			
			menup.td_forums = createEl("td", { "class": "menu_td_forums" });
			var forumlink = createEl("a", { "target": "_blank", "href": "/forums" });
			linkify(forumlink, true);
			_l("forums", {}, forumlink);
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
			coglinks.appendChild(createEl("a", { "href": "http://www.theweeklyrelease.com", "textContent": "The Weekly Release" } ));
			coglinks.appendChild(createEl("a", { "href": "http://popculturezoo.com/", "textContent": "Pop Culture Zoo" } ));
			coglinks.appendChild(createEl("hr"));
			coglinks.appendChild(createEl("a", { "href": "http://www.immortalmachines.com", "textContent": "Immortal Machines" } ));
			coglinks.appendChild(createEl("a", { "href": "http://www.ingamechat.net", "textContent": "In-Game Chat" } ));
			coglinks.appendChild(createEl("a", { "href": "http://gameradio.us/", "textContent": "FUDcast" } ));
			coglinks.appendChild(createEl("a", { "href": "http://www.thecomicsarchive.com/", "textContent": "Comics Archive" } ));
			
			var cogbanner = createEl("div", { "class": "COG_banner" });
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
			if (menup.playeradded) return;
			if (flashloaded) return;
			
			if (!removedflash) {
				menup.player.removeChild(menup.flash_warning);
				menup.player.className = "menu_player";
				removedflash = true;
				//menup.or_use.textContent = _l("use");
			}
			
			if (tunedin) {
				menup.player.className = "menu_player menu_player_tunedin";
				menup.player.textContent = _l("tunedin");
			}
			else {
				menup.tuneInClickThemeHook();
				// menup.player.className = "menu_player fakebutton menu_player_tunedout";
				// _l("tunedout", false, menup.player);
			}
		};
		
		menup.showUsername = function(username) {
			menup.username.textContent = username;
			if (user.p.radio_perks > 0) {
				menup.username.className = "menu_username menu_username_perks link";
			}
			else if (user.p.user_id > 1) {
				menup.username.className = "menu_username link";
			}
			else {
				menup.username.className = "menu_username";
			}
			var pnode;
			if (menup.loginreg.parentNode) pnode = menup.loginreg.parentNode;
			else if (menup.username.parentNode) pnode = menup.username.parentNode;
			if (username && menup.loginreg.parentNode) pnode.removeChild(menup.loginreg);
			else if (!username && !menup.loginreg.parentNode) pnode.appendChild(menup.loginreg);
			if (!username && menup.username.parentNode) pnode.removeChild(menup.username);
			else if (username && !menup.username.parentNode) pnode.appendChild(menup.username);
		};
		
		menup.playerInitThemeHook = function() {
			flashloaded = true;
			menup.flash_container.removeChild(menup.flash_warning);
		};
		
		menup.tuneInClickThemeHook = function() {
			if (flashloaded) menup.flash_container.removeChild(document.getElementById("embedded_swf"));
			menup.player.textContent = "";
			menup.player.appendChild(menup.flash_warning);
			menup.player.className = "menu_player menu_player_flash";
			//menup.or_use.textContent = _l("oruse");
			flashloaded = false;
			menup.playeradded = false;
		};
		
		return menup;
	};
		
	/*****************************************************************************
	   MPI Styling
	*****************************************************************************/

	that.Extend.MainMPI = function(mpi) {
		mpi.postDraw = function() {
			//mpi.bkg = document.createElement("div");
			//mpi.divSize(mpi.bkg);
			//mpi.divPosition(mpi.bkg);
			//mpi.bkg.style.zIndex = "1";
			//mpi.bkg.style.top = mpi.tabheight + "px";
			//mpi.container.appendChild(mpi.bkg);
		};
		
		return mpi;
	};

	that.TabBar = function(container) {
		var tabs = {};
		tabs.container = container;
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
		pp.drawAlbum = function(wdow, json) {
			wdow.hdrtable = createEl("table", { "style": "width: 100%; margin-bottom: 0.5em;", "cellspacing": 0 }, wdow.div);
		
			var tr = createEl("tr", false, wdow.hdrtable);
			wdow.albumnametd = createEl("td", { "class": "pl_ad_albumnametd", "colspan": 2 }, tr);
			wdow.albumrating = Rating({ category: "album", id: json.album_id, userrating: json.album_rating_user, siterating: json.album_rating_avg, favourite: json.album_favourite, scale: 1.2, register: true });
			wdow.albumnametd.appendChild(wdow.albumrating.el);
			wdow.albumname = createEl("div", { "class": "pl_ad_albumname", "textContent": json.album_name }, wdow.albumnametd);
			if (json.sid != user.p.sid) createEl("img", { "src": skindir + "/images/menu_logo_" + json.sid + ".png", "class": "pl_ad_albumname_station" }, wdow.albumname);

			tr = createEl("tr", false, wdow.hdrtable);
			wdow.albumdetailtd = createEl("td", { "class": "pl_ad_albumdetailtd" }, tr);
			
			if ((json.album_rating_count >= 10) && svg.capable) {
				var gr = graph.makeSVG(200, 120 - (UISCALE * 3), [
					{	"options": {
							"stroke": that.BarGraphStroke,
							"fill": that.BarGraphFill,
							"xaxis_min": 0.5,
							"xaxis_max": 5,
							"xaxis_steps": 9,
							"yaxis_steps": 3,
							"xaxis_precision": 1, 
							"xgrid_modulus": 1, 
							"xaxis_nomin": true, 
							"yaxis_nomin": true,
							"yaxis_min": 0,
							"xgrid_disable": true,
							"xaxis_padpx": 13,
							"yaxis_minrange": 5
						},
						"data": json.album_rating_histogram,
						"graphfunc": graph.Bar
					} ] );
				gr.svg.setAttribute("class", "pl_ad_ratinghisto");
				wdow.albumdetailtd.appendChild(gr.svg);
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
			wdow.albumdetailtd.appendChild(stats);
			
			wdow.albumarttd = createEl("td", { "class": "pl_ad_albumart_td" }, tr);
			if (json.album_art) {
				createEl("img", { "src": PRELOADED_LYREURL + json.album_art, "class": "pl_ad_albumart" }, wdow.albumarttd);
			}
			else {
				if (user.p.sid == 2) createEl("img", { "src": skindir + "/images/noart_2.jpg", "class": "pl_ad_albumart" }, wdow.albumarttd);
				else createEl("img", { "src": skindir + "/images/noart_1.jpg", "class": "pl_ad_albumart" }, wdow.albumarttd);
			}
			
			wdow.songarray = [];
			if (user.p.sid == 5) {	
				var hdr;
				var render = {};
				for (var i = 0; i < STATIONS.length; i++) {
					render[i] = [];
				}
				for (i = 0; i < json.song_data.length; i++) {
					render[json.song_data[i].song_rating_sid].push(json.song_data[i]);
				}
				for (i = 0; i < STATIONS.length; i++) {
					if (render[i].length > 0) {
						createEl("div", { "class": "pl_songlist_hdr station_" + i, "style": "clear: both;" }, wdow.div);
						that.drawAlbumTable(createEl("table", { "class": "pl_songlist" }, wdow.div), wdow.songarray, render[i]);
					}
				}
			}
			else {
				wdow.songlist = createEl("table", { "class": "pl_songlist", "style": "clear: both;" }, wdow.div);
				that.drawAlbumTable(wdow.songlist, wdow.songarray, json.song_data);
			}
			
			wdow.updateHelp = function() {
				if (wdow.songarray.length > 0) {
					help.changeStepPointEl("clicktorequest", [ wdow.songarray[0].td_r ]);
				}
			};
		};

		pp.drawArtist = function(wdow, json) {
			wdow.hdrtable = createEl("table", { "style": "width: 100%;", "cellspacing": 0 }, wdow.div);
			var tr = createEl("tr", false, wdow.hdrtable);
			wdow.artistnametd = createEl("td", { "class": "pl_ad_albumnametd" }, tr);
			wdow.artistname = createEl("div", { "class": "pl_ad_albumname", "textContent": json.artist_name }, wdow.artistnametd);
			
			var album_id = -1;
			var album_name;
			var album_sid = 0;
			var album = [];
			var drawntables = [];
			var i, j;
			for (i = 0; i < STATIONS.length + 2; i++) {
				drawntables[i] = [];
			}
			for (i = 0; i < json.songs.length; i++) {
				if ((json.songs[i].album_id != album_id) && (((album_sid != 2) && (album_sid != 3)) || (album_sid != json.songs[i].sid))) {
					if (album.length > 0) {
						drawntables[album_sid].push(pp.drawArtistTable(wdow, album, album_id, album_name, album_sid));
					}
					album_id = json.songs[i].album_id;
					album_name = json.songs[i].album_name;
					album_sid = json.songs[i].sid;
					album = [];
				}
				album.push(json.songs[i]);
			}
			if (album.length > 0) {
				drawntables[album_sid].push(pp.drawArtistTable(wdow, album, album_id, album_name, album_sid));
			}
			
			for (j = 0; j < drawntables[user.p.sid].length; j++) {
				wdow.div.appendChild(drawntables[user.p.sid][j]);
			}
			
			for (i = 0; i < drawntables.length; i++) {
				if (i != user.p.sid) {
					for (j = 0; j < drawntables[i].length; j++) {
						wdow.div.appendChild(drawntables[i][j]);
					}
				}
			}
		};
		
		pp.drawArtistTable = function(wdow, album, album_id, album_name, album_sid) {
			var encloseddiv = createEl("div");
			if (album_sid == 2) {
				album_name = _l("overclockedremixes");
				album_id = -1;
			}
			else if (album_sid == 3) {
				album_name = _l("mixwavesongs");
				album_id = -1;
			}
			var hdr = createEl("div", { "class": "pl_songlist_hdr", "textcontent": STATIONS[album_sid] }, encloseddiv);
			//createEl("img", { "src": skindir + "/images/menu_logo_" + album_sid + ".png", "style": "float: right;" }, hdr);
			var album_hdr = createEl("span", { "textContent": album_name }, hdr);
			if (album_id != -1) Album.linkify(album_id, album_hdr);
			var tbl = createEl("table", { "class": "pl_songlist" }, encloseddiv);
			var useless = [];
			that.drawAlbumTable(tbl, useless, album);
			return encloseddiv;
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
				
				if (("sid" in song_data[i]) && (song_data[i].sid != user.p.sid)) {
					ns.td_r = createEl("td", { "class": "pl_songlist_r" }, ns.tr);
				}
				else {
					ns.td_r = document.createElement("td");
					ns.td_r.setAttribute("class", "pl_songlist_r");
					ns.td_r.textContent = "R";
					Request.linkify(song_data[i].song_id, ns.td_r);
					ns.tr.appendChild(ns.td_r);
				}
				
				if ("album_name" in song_data[i]) {
					ns.td_album_name = createEl("td", { "class": "pl_songlist_album_name" }, ns.tr);
					ns.td_album_name_text = createEl("div", { "textContent": song_data[i].album_name }, ns.td_album_name);
					Album.linkify(song_data[i].album_id, ns.td_album_name_text);
				}
				
				if (("song_url" in song_data[i]) && (song_data[i].song_url.length > 0)) {
					ns.td_u = document.createElement("td");
					ns.td_u.setAttribute("class", "pl_songlist_url");
					ns.td_u_a = createEl("a", { "class": "link", "href": song_data[i].song_url, "target": "_blank", "textContent": " " }, ns.td_u);
					ns.tr.appendChild(ns.td_u);
				}
				else {
					ns.td_u = createEl("td", { "class": "pl_songlist_url" }, ns.tr);
				}
				
				ns.td_n = createEl("td", { "class": "pl_songlist_title" }, ns.tr);
				ns.td_n_text = createEl("div", { "textContent": song_data[i].song_title }, ns.td_n);
				
				if ("artists" in song_data[i]) {
					ns.td_a = document.createElement("td");
					ns.td_a.setAttribute("class", "pl_songlist_artists");
					Artist.allArtistToHTML(song_data[i].artists, ns.td_a);
					ns.tr.appendChild(ns.td_a);
				}
				
				if ("song_rating_user" in song_data[i]) {
					ns.td_rating = document.createElement("td");
					ns.td_rating.setAttribute("class", "pl_songlist_rating");
					ns.td_rating.style.width = (that.Rating_width + 5) + "px";
					ns.rating = Rating({ category: "song", id: song_data[i].song_id, userrating: song_data[i].song_rating_user, x: 0, y: 1, siterating: song_data[i].song_rating_avg, favourite: song_data[i].song_favourite, register: true });
					ns.td_rating.appendChild(ns.rating.el);
					ns.tr.appendChild(ns.td_rating);
				}
				
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
					
					ns.td_fc = document.createElement("td");
					ns.td_fc.setAttribute("class", "pl_songlist_forcecandidate");
					ns.td_fc.textContent = "ElecUp";
					Song.linkifyAsForceCandidate(song_data[i].song_id, ns.td_fc);
					ns.tr.appendChild(ns.td_fc);
				}

				if (song_data[i].song_id && (user.p.radio_admin > 0)) {
					ns.td_multiplier = document.createElement("td");
					ns.td_multiplier.setAttribute("class", "pl_songlist_multiplier");
					ns.multiplier_field = createEl("input", { "type": "text", "value": song_data[i].song_oa_multiplier }, ns.td_multiplier);
					Song.addChangeMultiplierListener(song_data[i].song_id, ns.multiplier_field);
					ns.tr.appendChild(ns.td_multiplier);
				}
				
				table.appendChild(ns.tr);
				songarray.push(ns);
			}
	};
	
	// /*****************************************************************************
	// LISTENERS PANELS
	// *****************************************************************************/
	
	that.ListenerBarCSS = function(percent) {
		var firststop = (percent > 15) ? percent - 15 : 0;
	
		var style = "background-image: -webkit-gradient(";
		style += 		"linear, left top, right top,";
		style +=		"color-stop(" + (firststop / 100) + ", rgb(0, 35, 163)),";
		style +=		"color-stop(" + (percent / 100) + ", rgb(45, 109, 227))";
		if (percent < 99) {
			style += ", color-stop(" + ((percent + 1) / 100) + ", rgba(0, 0, 0, 0))";
		}
		style += ");";
		
		style += "background-image: -moz-linear-gradient(left center,"
		style +=	"rgb(0, 35, 163) " + firststop + "%,";
		style += 	"rgb(45, 109, 227) " + percent + "%";
		if (percent < 99) {
			style += ", rgba(0, 0, 0, 0) " + (percent + 1) + "%";
		}
		style += ");";
		
		return style;
	}
	
	that.Extend.ListenersPanel = function(lp) {	
		lp.drawListener = function(wdow, json) {
			wdow.hdrtable = createEl("table", { "style": "width: 100%; margin-bottom: 0.5em;", "cellspacing": 0 }, wdow.div);
		
			var tr = createEl("tr", false, wdow.hdrtable);
			wdow.listenernametd = createEl("td", { "class": "pl_ad_albumnametd", "colspan": 2 }, tr);
			wdow.refresh = createEl("div", { "class": "pl_ad_albumname_detail", "textContent": _l("refresh") }, wdow.listenernametd);
			wdow.refresh.addEventListener("click", function() { Username.openFresh(json.user_id); }, true);
			wdow.listenername = createEl("div", { "class": "pl_ad_albumname", "textContent": json.username }, wdow.listenernametd);

			tr = createEl("tr", false, wdow.hdrtable);
			wdow.detailtd = createEl("td", { "class": "pl_ad_albumdetailtd" }, tr);
			
			// Single statistics
			var dtable = createEl("table", { "class": "listener_header_detail" });
			
			var dtr = createEl("tr", false, dtable);
			createEl("td", { "textContent": _l("voteslast2weeks") }, dtr);
			createEl("td", { "textContent": json.radio_2wkvotes }, dtr);
			
			dtr = createEl("tr", false, dtable);
			createEl("td", { "textContent": _l("voterecord") }, dtr);
			var voteratio = (json.radio_losingvotes + json.radio_winningvotes > 0) ? Math.round(json.radio_winningvotes / (json.radio_winningvotes + json.radio_losingvotes) * 100) : 0;
			createEl("td", { "textContent": _l("votewinloss", { "wins": json.radio_winningvotes, "losses": json.radio_losingvotes, "ratio": voteratio } ) }, dtr);
			
			dtr = createEl("tr", false, dtable);
			createEl("td", { "textContent": _l("requestrecord") }, dtr);
			var requestratio = (json.radio_winningrequests + json.radio_losingrequests > 0) ? Math.round(json.radio_winningrequests / (json.radio_winningrequests + json.radio_losingrequests) * 100) : 0;
			createEl("td", { "textContent": _l("requestwinloss", { "wins": json.radio_winningrequests, "losses": json.radio_losingrequests, "ratio": requestratio }) }, dtr);
			
			wdow.detailtd.appendChild(dtable);

			// Avatar
			wdow.avatartd = createEl("td", { "class": "pl_ad_albumart_td" }, tr);
			if (json.user_avatar && (json.user_avatar != "images/blank.png")) {
				createEl("img", { "src": json.user_avatar, "class": "pl_ad_albumart" }, wdow.avatartd);
			}
			else {
				createEl("img", { "src": skindir + "/images/noart_1.jpg", "class": "pl_ad_albumart" }, wdow.avatartd);
			}
			
			wdow.div.appendChild(wdow.hdrtable);
			
			var centrediv = createEl("div", { "class": "ldetail_container" });

			// Vote graphs
			if (json.user_2wk_voting.length > 2) {
				createEl("div", { "class": "graph_header", "textContent": _l("lsnr_rankgraph_header") }, centrediv);
				var vcdata = {};
				vcdata2 = {};
				var maxrank = 0;
				for (var i = 0; i < json.user_2wk_voting.length; i++) {
					if (json.user_2wk_voting[i].user_vote_count) {
						vcdata[json.user_2wk_voting[i].vhist_day] = json.user_2wk_voting[i].user_vote_count;
						vcdata2[json.user_2wk_voting[i].vhist_day] = json.user_2wk_voting[i].user_vote_rank;
						if (json.user_2wk_voting[i].user_vote_rank > maxrank) {
							maxrank = json.user_2wk_voting[i].user_vote_rank;
						}
					}
				}
				var maxtime = clock.now;
				var mintime = clock.now - 2592000 - 86400 - (86400 / 2);	// this number is 30 * 86400, the same number that's in Lyre
				var gr2maxy = Math.ceil(maxrank / 50) * 50;
				var xgrid_start = new Date(mintime).getDay() - 1;
				if (xgrid_start < 0) xgrid_start = 86400;
				else xgrid_start = ((5 - xgrid_start) * 86400) + mintime;
				var gr = graph.makeSVG(400, 300, [
					{	"options": {
							"stroke": that.BarGraphStroke, 
							"fill": that.BarGraphFill, 
							"xaxis_nonumbers": true, 
							"yaxis_minrange": 100, 
							"xaxis_max": maxtime, 
							"xaxis_steps": 30,
							"xaxis_min": mintime,
							"xgrid_start": xgrid_start,
							"xgrid_perstep": 604800
						},
						"data": vcdata,
						"graphfunc": graph.Bar
					},
					{	"options": { 
							"stroke": that.LineGraphColor, 
							"fill": that.LineGraphColor, 
							"yaxis_reverse": true, 
							"yaxis_min": 1, 
							"yaxis_max": gr2maxy, 
							"xaxis_max": maxtime, 
							"xaxis_min": mintime
						},
						"data": vcdata2,
						"graphfunc": graph.Line
					} ] );
				centrediv.appendChild(gr.svg);
				centrediv.appendChild(createEl("hr"));
			}
			
			// Station breakdown
			var stationstats = createEl("table", { "class": "listener_detail" });
			
			var tr = createEl("tr", false, stationstats);
			createEl("td", false, tr);
			createEl("td", { "class": "lsnrdt_spacer" }, tr);
			createEl("td", { "textContent": _l("lsnrdt_averagerating") }, tr);
			createEl("td", { "class": "lsnrdt_spacer" }, tr);
			createEl("td", { "textContent": _l("lsnrdt_ratingprogress") }, tr);
			createEl("td", { "class": "lsnrdt_spacer" }, tr);
			createEl("td", { "textContent": _l("lsnrdt_percentofratings") }, tr);
			createEl("td", { "class": "lsnrdt_spacer" }, tr);
			createEl("td", { "textContent": _l("lsnrdt_percentofrequests") }, tr);
			createEl("td", { "class": "lsnrdt_spacer" }, tr);
			createEl("td", { "textContent": _l("lsnrdt_percentofvotes") }, tr);
			
			tr = createEl("tr", false, stationstats);
			createEl("td", { "textContent": _l("lsnrdt_allstations") }, tr);
			createEl("td", { "class": "lsnrdt_spacer" }, tr);
			createEl("td", { "textContent": json.user_station_specific[0].rating_average.toFixed(2) }, tr);
			createEl("td", { "class": "lsnrdt_spacer" }, tr);
			createEl("td", { "class": "lsnrdt_bar", "style": that.ListenerBarCSS(json.user_station_specific[0].rating_progress), "textContent": json.user_station_specific[0].rating_progress + "%" }, tr);
			createEl("td", { "class": "lsnrdt_spacer" }, tr);
			createEl("td", false, tr);
			createEl("td", { "class": "lsnrdt_spacer" }, tr);
			createEl("td", false, tr);
			createEl("td", { "class": "lsnrdt_spacer" }, tr);
			createEl("td", false, tr);
			
			tr = createEl("tr", false, stationstats);
			createEl("td", { "class": "lsnrdt_spacer" }, tr);
			
			var stations = [];
			for (var i in json.user_station_specific) {
				if (i != 0) stations.push(i);
			}
			stations.sort();
			
			for (var h = 0; h < stations.length; h++) {
				i = stations[h];
				tr = createEl("tr", false, stationstats);
				createEl("td", { "textContent": STATIONS[i] }, tr);
				createEl("td", { "class": "lsnrdt_spacer" }, tr);
				if (i != 5) {
					createEl("td", { "textContent": json.user_station_specific[i].rating_average.toFixed(2) }, tr);
					createEl("td", { "class": "lsnrdt_spacer" }, tr);
					createEl("td", { "class": "lsnrdt_bar", "style": that.ListenerBarCSS(json.user_station_specific[i].rating_progress), "textContent": json.user_station_specific[i].rating_progress + "%" }, tr);
					createEl("td", { "class": "lsnrdt_spacer" }, tr);
					createEl("td", { "class": "lsnrdt_bar", "style": that.ListenerBarCSS(json.user_station_specific[i].rating_percentage), "textContent": json.user_station_specific[i].rating_percentage + "%" }, tr);
				}
				else {
					createEl("td", { "textContent": _l("notapplicable"), "class": "lsnrdt_notapplicable" }, tr);
					createEl("td", { "class": "lsnrdt_spacer" }, tr);
					createEl("td", { "class": "lsnrdt_bar lsnrdt_notapplicable", "textContent": _l("notapplicable") }, tr);
					createEl("td", { "class": "lsnrdt_spacer" }, tr);
					createEl("td", { "class": "lsnrdt_bar lsnrdt_notapplicable", "textContent": _l("notapplicable") }, tr);
				}
				createEl("td", { "class": "lsnrdt_spacer" }, tr);
				createEl("td", { "class": "lsnrdt_bar", "style": that.ListenerBarCSS(json.user_station_specific[i].request_percentage), "textContent": json.user_station_specific[i].request_percentage + "%" }, tr);
				createEl("td", { "class": "lsnrdt_spacer" }, tr);
				createEl("td", { "class": "lsnrdt_bar", "style": that.ListenerBarCSS(json.user_station_specific[i].vote_percentage), "textContent": json.user_station_specific[i].vote_percentage + "%" }, tr);
			}
			
			centrediv.appendChild(stationstats);
			wdow.div.appendChild(centrediv);
			
		};
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
			
			obj.fx_opacity = fx.make(fx.CSSNumeric, obj.el, 250, "opacity");
			obj.fx_opacity.set(0);
			
			BODY.appendChild(obj.el);
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
	// Error Skinning
	// *****************************************************************************/
	
	that.Extend.Ticker = function(ticker) {
		var currentitem = false;

		ticker.showItem = function(item) {
			item.el = createEl("div", { "class": "ticker_item" }, ticker.el);
			item.xbutton = createEl("span", { "class": "ticker_x", "textContent": "[X]" }, item.el);
			item.xbutton.addEventListener("click", function() { ticker.nextItem(); }, true);
			if (item.url) {
				item.textel = createEl("a", { "href": item.url, "class": "ticker_text", "textContent": item.text }, item.el);
				linkify(item.textel, true, true);
			}
			else {
				item.textel = createEl("span", { "class": "ticker_text", "textContent": item.text }, item.el);
			}
			item.effect = fx.make(fx.CSSNumeric, item.el, 400, "marginTop", "px");
			item.opacity = fx.make(fx.CSSNumeric, item.el, 400, "opacity");
			item.effect.start(20, 0);
			item.opacity.start(0, 1);
			currentitem = item;
		};
		
		ticker.hideItem = function() {
			if (!currentitem) return;
			if (currentitem.x_api_action) {
				lyre.async_get(currentitem.x_api_action, currentitem.x_api_params);
			}
			currentitem.effect.start(0, -20);
			currentitem.opacity.start(1, 0);
			currentitem.effect.onComplete = function() {
				while (ticker.el.firstChild != ticker.el.lastChild) {
					ticker.el.removeChild(ticker.el.firstChild);
				}
			};
		};
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
	
	that.BarGraphStroke = function(graphindex, x, y) {
		return "#000000";
	};
	
	that.BarGraphFill = function(graphindex, x, y) {
		return "url(#Rating_usergradient)";
	};
	
	that.LineGraphColor = function(graphindex, x, y) {
		var key = Math.round(120 * (1 - y)) + 128 + 44;
		var sub = 80;
		var comp = key - 50;
		if (graphindex == 1) {
			return "rgb(" + comp + ", " + key + ", " + sub + ")";
		}
		else {
			return "rgb(" + sub + ", " + comp + ", " + key + ")";
		}
	};
	
	return that;
};
