/*	Rainwave Classic Theme for Edi 1.0

	This is the Rainwave 2 design upgraded for R3.  It is almost 100% SVG, and as such is VERY hard to
	understand through the code at first blush.  While it is the most "complete" theme you can look at,
	it's probably also the hardest one.  If you're looking to build your own theme, it may not be a wise
	idea to start with this one.
	
	Due to the way that CSS is loaded onto the page from the theme, it is HIGHLY recommend you change the
	<body> tag's style as part of your theme's init to change your font and font size, then call svg.measureEm()
	to make sure your measurements are accurate.
	
             ***** IMPORTANT README ABOUT SCOPING *****
			 
	Scoping is handled in the theme in very tricky ways!
	
	Here's how it works:
	that.[function]
		Gets executed within EdiTheme's scope with full access to EdiTheme's closures.
	that.Extend.[object]
		Gets executed within the objects' scope.  "this" will be the object.  No access to closured variables.
	that.[object].[function]
		Gets executed within the objects' scope.  "this" is not explicit.  Has access to EdiTheme's closures.
		
	There are a *lot* of variables defined by Edi that functions have access to.  Docs on them don't exist, so
	you'll just have to debug.  Sorry. :)  About all I can tell you is that you do have access to a "tv" (theme variable)
	array you can manipulate to your hearts content in the theme.
*/

/*****************************************************************************
  RW CLASSIC THEME
*****************************************************************************/

function EdiTheme() {
	document.getElementById("body").style.fontFamily = "Tahoma, Sans-Serif";
	document.getElementById("body").style.fontSize = "0.8em";
	svg.measureEm();

	var that = {};

	that.textcolor = "#FFFFFF";
	that.TimelineSong_height = (svg.em + 9) * 3;		// font size + padding * 3 rows
	that.Timeline_headerheight = svg.em * 0.8 + 4;
	that.borderheight = 12;
	that.borderwidth = 12;
	that.name = _l("s_RainwaveClassic");
	that.MPI_MenuHeight = svg.em * 2;
	that.MPI_MenuYPad = 2;
	that.PLS_AlbumHeight = svg.em * 1.5;
	that.helplinecolor = "#c287ff";
	
	//panels.NowPanel.height = (that.TimelineSong_height * 3) + 12;
	
	// The following variables are internal to that theme, related to a specific "class"
	that.Timeline_leftsidesize = 10;
	
	that.TimelineSong_rowheight = that.TimelineSong_height / 3;
	that.TimelineSong_leftclipext = 1;			// how many rows the timeline song left clip uses
	
	that.Rating_gridcolor = "#708a90";
	that.Rating_gridsizex = svg.em * 5;			// TODO: that should be * 6 but so many measurements are based off that now... :/
	that.Rating_gridsizey = svg.em * 1.2;
	that.Rating_unitsize = that.Rating_gridsizex / 5;
	that.Rating_strikey = Math.round(that.Rating_gridsizey * 0.65);
	that.Rating_striketopy = that.Rating_strikey / 2;
	that.Rating_strikeboty = (that.Rating_gridsizey - that.Rating_strikey) * 0.7;

	// The following are variables used internally by the theme
	that.linkcolor = "#6cf6ff";
	that.darktext = "#CCCCCC";
	that.vdarktext = "#777777";
	that.primarybkg = "#142027";
	that.brightbkg = "#3f4b52";	
	that.songborderdark = "#355669";
	that.songborderbright = "#7d94a1";
	that.ediborderdark = "#000000";
	that.ediborderbright = that.songborderdark;
	that.indicnormal = "#244093";
	that.indicnormalbright = "#3c6dff";
	that.indicwarn = "#84880c"; // 666717
	that.indicwarnbright = "#C2C810";
	that.indicconflict = that.indicwarn;
	that.indicconflictbright = that.indicwarnbright;
	that.indicrequest = "#247293";
	that.indicrequestbright = "#3585c3";

	// Edi required variable that depends on previously-defined variables
	// text ratings + grid size + fav margin + fav + padding
	that.Rating_shortwidth = Math.floor(that.Rating_gridsizex + that.Rating_gridsizey + 3 + 8 + 5);
	that.Rating_width = Math.floor((svg.em * 2.2) + that.Rating_shortwidth);
	
	var logoheight = 40;
	var logowidth = 200;
	
	that.Extend = {};
	
	/* ALL DEFINITIONS */
	that.allDefs = function(svgel, defs) {
		that.borderDefs(svgel, defs);
		that.ratingDefs(svgel, defs);
		that.timelineSongDefs(svgel, defs);
		that.menuDefs(svgel, defs);
	};

	/*****************************************************************************
	  EDI BORDERS
	  
	  These border functions are passed <svg> elements.
	*****************************************************************************/

	that.borderDefs = function(svgel, defs) {
		var gright = svg.makeGradient("linear", "bleft", "100%", "0%", "0%", "0%", "pad");
		gright.appendChild(svg.makeStop("30%", that.ediborderdark, 0));
		gright.appendChild(svg.makeStop("50%", that.ediborderbright, 1));
		gright.appendChild(svg.makeStop("97%", that.ediborderbright, 1));
		gright.appendChild(svg.makeStop("100%", that.ediborderdark, 0));

		var gleft = svg.makeGradient("linear", "bright", "0%", "0%", "100%", "0%", "pad");
		gleft.appendChild(svg.makeStop("30%", that.ediborderdark, 0));
		gleft.appendChild(svg.makeStop("50%", that.ediborderbright, 1));
		gleft.appendChild(svg.makeStop("97%", that.ediborderbright, 1));
		gleft.appendChild(svg.makeStop("100%", that.ediborderdark, 0));

		var gtop = svg.makeGradient("linear", "btop", "0%", "100%", "0%", "0%", "pad");
		gtop.appendChild(svg.makeStop("30%", that.ediborderdark, 0));
		gtop.appendChild(svg.makeStop("50%", that.ediborderbright, 1));
		gtop.appendChild(svg.makeStop("97%", that.ediborderbright, 1));
		gtop.appendChild(svg.makeStop("100%", that.ediborderdark, 0));

		var gbottom = svg.makeGradient("linear", "bbottom", "0%", "0%", "0%", "100%", "pad");
		gbottom.appendChild(svg.makeStop("30%", that.ediborderdark, 0));
		gbottom.appendChild(svg.makeStop("50%", that.ediborderbright, 1));
		gbottom.appendChild(svg.makeStop("97%", that.ediborderbright, 1));
		gbottom.appendChild(svg.makeStop("100%", that.ediborderdark, 0));
		
		/*var virregular = svg.makeGradient("linear", "bvirregular", "0%", "0%", "0%", "100%", "pad");
		virregular.appendChild(svg.makeStop("0%", that.ediborderdark, 0));
		virregular.appendChild(svg.makeStop("5%", that.ediborderbright, 1));
		virregular.appendChild(svg.makeStop("30%", that.ediborderbright, 1));
		virregular.appendChild(svg.makeStop("40%", that.ediborderbright, 0));*/

		defs.appendChild(gright);
		defs.appendChild(gleft);
		defs.appendChild(gtop);
		defs.appendChild(gbottom);
		//defs.appendChild(virregular);
	};

	that.borderVertical = function(border) {
		var bkg = svg.makeRect("50%", 0, 1, "100%");
		if (border.irregular && !border.vfirst) {
			bkg.setAttribute("fill", "url(#bvirregular)");
		}
		else {
			if (!border.vlast) bkg.setAttribute("fill", "url(#bbottom)");
			else bkg.setAttribute("fill", "url(#btop)");
		}
		border.el.appendChild(bkg);
	};

	that.borderHorizontal = function(border) {
		var bkg = svg.makeRect(0, "50%", "100%", 1);
		if (!border.hlast) bkg.setAttribute("fill", "url(#bright)");
		else bkg.setAttribute("fill", "url(#bleft)");
		border.el.appendChild(bkg);
	};

	/*that.borderCorner = function(border) {
		if (border.top) {
			var line = svg.makeLine("50%", "0%", "50%", "50%", { shape_rendering: "crispEdges", stroke: songborderdark, stroke_width: 1 } );
			border.el.appendChild(line);
		}
		
		if (border.right) {
			var line = svg.makeLine("50%", "50%", "100%", "50%", { shape_rendering: "crispEdges", stroke: songborderdark, stroke_width: 1 } );
			border.el.appendChild(line);
		}
		
		if (border.bottom) {
			var line = svg.makeLine("50%", "50%", "50%", "100%", { shape_rendering: "crispEdges", stroke: songborderdark, stroke_width: 1 } );
			border.el.appendChild(line);
		}
		
		if (border.left) {
			var line = svg.makeLine("0%", "50%", "50%", "50%", { shape_rendering: "crispEdges", stroke: songborderdark, stroke_width: 1 } );
			border.el.appendChild(line);
		}
	};*/
	
	/*****************************************************************************
	  RATING EFFECTS
	*****************************************************************************/
	
	fx.extend("UserRating", function(object, duration) {
		var urfx = {};
		urfx.duration = duration;
		urfx.update = function() {
			object.userel.setAttribute("d", "M0,0 H" + (that.Rating_unitsize * urfx.now) + " L" + (that.Rating_strikey + (that.Rating_unitsize * urfx.now)) + "," + that.Rating_strikey + " H" + that.Rating_strikey + " Z");
			var text = (Math.round(urfx.now * 10) / 10).toFixed(1);
			if (text == "0.0") text = "";
			object.usertext.textContent = text;
		};
			
		return urfx;
	});
	
	fx.extend("SiteRating", function(object, duration) {
		var srfx = {};
		srfx.duration = duration;
		srfx.update = function() {
			object.siteel.setAttribute("d", "M" + that.Rating_strikey + "," + that.Rating_strikey +" H" + (that.Rating_strikey + (that.Rating_unitsize * srfx.now)) + " L" + (that.Rating_gridsizey + (that.Rating_unitsize * srfx.now) + 1) + "," + (that.Rating_gridsizey + 1) + " H" + that.Rating_gridsizey + " Z");
			//var text = Math.round(srfx.now * 10) / 10;
			//if (srfx.now == 0) text = "";
			//else if ((srfx.now % 1) == 0) text += ".0";
			//object.sitetext.textContent = text;
		};
			
		return srfx;
	});

	/*****************************************************************************
	  RATING
	*****************************************************************************/

	// RatingDefs is used in other classes' themeInit() to provide <defs> tags relevant to the Ratings class.
	// 	You'll see the pattern of adding a Defs functon to the Theme class a lot.
	// The reason it's a part of the theme is because "theme" is a global variable.  I do not need to instantiate
	// 	the Rating class in order to get the <defs>. (and each Rating class does not have to carry the function def)
	that.ratingDefs = function(svgel, defs) {
		var usergradient = svg.makeGradient("linear", "Rating_usergradient", "0%", "0%", "0%", "100%", "pad");
		usergradient.appendChild(svg.makeStop("15%", "#b9e0ff", "1"));
		usergradient.appendChild(svg.makeStop("50%", "#8bccff", "1"));
		usergradient.appendChild(svg.makeStop("85%", "#8bccff", "1"));
		usergradient.appendChild(svg.makeStop("100%", "#76add8", "1"));
		defs.appendChild(usergradient);
		
		var sitegradient = svg.makeGradient("linear", "Rating_sitegradient", "0%", "0%", "0%", "100%", "pad");
		sitegradient.appendChild(svg.makeStop("0%", "#5fff55", "1"));
		sitegradient.appendChild(svg.makeStop("75%", "#95c7ee", "1"));
		defs.appendChild(sitegradient);

		var favgradient = svg.makeGradient("linear", "Rating_favgradient", "0%", "0%", "0%", "100%", "pad");
		favgradient.appendChild(svg.makeStop("25%", "#ffff66", "1"));
		favgradient.appendChild(svg.makeStop("60%", "#ffc900", "1"));
		favgradient.appendChild(svg.makeStop("100%", "#ffa200", "1"));
		defs.appendChild(favgradient);
	};

	that.Extend.Rating = function(ro) {
		//ro.sitetext = false;
		ro.usertext = false;
		ro.userel = false;
		ro.siteel = false;
		
		var ratingok = false;
		var fxRating = false;
		var gridg = false;
		var grid = false;
		var fxUserAnim = false;
		var fxSiteAnim = false;
		var fav = false;
		var fxFav = false;
		
		// This function required by Edi
		ro.draw = function(x, y, scale) {
			var rwidth = (ro.notext) ? that.Rating_shortwidth : that.Rating_width;
			ro.el = svg.makeEl("g");
			var transform = "";
			if ((x > 0) || (y > 0)) transform = "translate(" + x + ", " + y + ") ";
			if (scale) transform += "scale(" + scale + ")";
			if (transform > "") ro.el.setAttribute("transform", transform);

			//ro.sitetext = svg.makeEl("text", { x: (svg.em * 2.2), y: (svg.em + 2), fill: that.darktext } );
			//if (!ro.notext) ro.el.appendChild(ro.sitetext);
				
			//ratingok = svg.makeEl("path", { transform: "translate(" + ((svg.em * 4.2) + that.Rating_gridsizex + 3) + ", 0)", stroke: "none", fill: that.indicnormal } );
			//ratingok.setAttribute("d", "M0,0 H8 L" + (that.Rating_gridsizey + 9) + "," + (that.Rating_gridsizey + 1) + " H" + that.Rating_gridsizey + " Z");
			ratingok = svg.makeRect(-2, 0, svg.em * 2.15, svg.em + 5, { stroke: "none", fill: that.indicnormal });
			ro.fxRatingOK = fx.make(fx.SVGAttrib, [ ratingok, 250, "opacity", "" ]);
			ro.fxRatingOK.set(0);
			if (!ro.notext) ro.el.appendChild(ratingok);
				
			// ro.ro.usertext required by Edi
			ro.usertext = svg.makeEl("text", { x: 0, y: (svg.em + 2), fill: that.textcolor } );
			if (!ro.notext) ro.el.appendChild(ro.usertext);

			var gridx = (ro.notext) ? 0 : svg.em * 2.2;
			gridg = svg.makeEl("g", { transform: "translate(" + gridx + ", 0)" } );

			grid = svg.makeEl("path", { stroke_width: 1, stroke: that.Rating_gridcolor, shape_rendering: "crispEdges", fill: "none" } );
			grid.setAttribute("d", "M0,0 H" + that.Rating_gridsizex + " L" + (that.Rating_gridsizex + that.Rating_gridsizey) + "," + that.Rating_gridsizey + " H" + that.Rating_gridsizey + " Z");
			gridg.appendChild(grid);
			ro.grid = grid;
			
			// ro.userel is required by Edi
			ro.userel = svg.makeEl("path", { stroke_width: 0, fill: "url(#Rating_usergradient)" } );
			fxUserAnim = fx.make(fx.UserRating, [ ro, 250 ]);
			gridg.appendChild(ro.userel);
			
			// ro.siteel is required by Edi
			ro.siteel = svg.makeEl("path", { stroke_width: 0, fill: "url(#Rating_sitegradient)" } );
			fxSiteAnim = fx.make(fx.SiteRating, [ ro, 250 ]);
			gridg.appendChild(ro.siteel);
			
			gridg.appendChild(svg.makeLine(that.Rating_strikey, that.Rating_strikey, (that.Rating_gridsizex + that.Rating_strikey), that.Rating_strikey, { "stroke-width": "1", "stroke": that.Rating_gridcolor, "shape-rendering": "crispEdges" }));
			for (var i = 1; i <= 4; i++) {
				var unitx = i * that.Rating_unitsize + that.Rating_strikey;
				gridg.appendChild(svg.makeLine((unitx - that.Rating_striketopy), that.Rating_striketopy, (unitx + that.Rating_strikeboty), (that.Rating_strikey + that.Rating_strikeboty), { "stroke-width": "1", "stroke": that.Rating_gridcolor }));
			}
			
			ro.el.appendChild(gridg);
			
			// ro.mousecatch required by Edi
			ro.mousecatch = svg.makeRect(gridx, 0, (that.Rating_gridsizex + that.Rating_gridsizey), that.Rating_gridsizey, { stroke: "none", fill: "black", opacity: 0 } );
			ro.el.appendChild(ro.mousecatch);
			
			var favb = svg.makeEl("path", { transform: "translate(" + (gridx + that.Rating_gridsizex + 3) + ", 0)", stroke_width: 1, stroke: that.Rating_gridcolor, shape_rendering: "crispEdges", fill: "none" } );
			favb.setAttribute("d", "M0,0 H8 L" + (that.Rating_gridsizey + 8) + "," + (that.Rating_gridsizey) + " H" + that.Rating_gridsizey + " Z");
			ro.el.appendChild(favb);
			ro.favbutton = favb;
			
			ro.favcatch = svg.makeEl("path", { transform: "translate(" + (gridx + that.Rating_gridsizex + 3) + ", 0)", stroke: "none", fill: "url(#Rating_favgradient)" } );
			ro.favcatch.setAttribute("d", "M0,0 H8 L" + (that.Rating_gridsizey + 9) + "," + (that.Rating_gridsizey + 1) + " H" + that.Rating_gridsizey + " Z");
			fxFav = fx.make(fx.SVGAttrib, [ ro.favcatch, 250, "opacity", "" ])
			fxFav.set(0);
			ro.el.appendChild(ro.favcatch);
		};

		// Required by Edi
		ro.setUser = function(userrating) {
			fxUserAnim.set(userrating);
		};

		// Required by Edi
		ro.resetUser = function() {
			fxUserAnim.start(ro.userrating);
		};

		// ro function required by Edi.  It may be called in animation functions.
		ro.setSite = function(siterating) {
			fxSiteAnim.set(siterating);
		};

		// ro function required by Edi.  Return the rating here.
		// Edi will filter for the 0.5 stepping, and the API won't allow anything but 0.5 steps, so don't try and be cute. :)
		ro.userCoord = function(evt) {
			var m = evt.target.getScreenCTM();
			var p = evt.target.viewportElement.createSVGPoint();
			p.x = evt.clientX;
			p.y = evt.clientY;
			p = p.matrixTransform(m.inverse());
			return (((p.x - svg.em * 2.4)) / (that.Rating_gridsizex / 5));
		};

		// ro function required by Edi.  State: 2 = mouseover, 1 = favourite, 0 = not favourite
		ro.favChange = function(state) {
			if (state == 2) fxFav.start(0.70)
			else if (state) fxFav.start(1);
			else fxFav.start(0);
		};

		ro.showConfirmClick = function() {
			ratingok.setAttribute("fill", that.indicnormal);
			ro.fxRatingOK.start(1);
		};

		ro.showConfirmOK = function() {
			ratingok.setAttribute("fill", "#2253e0");
			ro.fxRatingOK.start(1);
		};

		ro.showConfirmBad = function() {
			ratingok.setAttribute("fill", "#b22424");
			ro.fxRatingOK.start(1);
		};

		ro.resetConfirm = function() {
			ro.fxRatingOK.start(0);
		};
		
		return ro;
	};

	/*****************************************************************************
	 TIMELINE
	*****************************************************************************/
	
	that.Extend.TimelinePanel = function(tl) {
		tl.clipdefs = svg.make({ style: "position: absolute" });

		tl.draw = function() {
			that.TimelineSongClipPath(tl.clipdefs, tl);
			tl.container.appendChild(tl.clipdefs);
		};
		
		return tl;
	};

	/*****************************************************************************
	 TIMELINE ELECTION
	*****************************************************************************/
	
	that.drawTimelineEventHeader = function(te, text, colour, gradient, fill) {
		var gradbase = svg.makeRect(0, 0, theme.Timeline_leftsidesize, svg.em * 0.8 + 4, { fill: colour } );
		te.el.appendChild(gradbase);

		te.headlinegrad = svg.makeRect(0, 0, theme.Timeline_leftsidesize, svg.em * 0.8 + 4, { fill: gradient } );
		te.el.appendChild(te.headlinegrad);
		te.headlinebkg = svg.makeRect(theme.Timeline_leftsidesize, 0, (te.width - theme.Timeline_leftsidesize - 1), svg.em * 0.8 + 4, { fill: fill } );
		te.el.appendChild(te.headlinebkg);

		te.headline = svg.makeEl("text", { fill: theme.textcolor, x: theme.Timeline_leftsidesize - 4, y: svg.em * 0.8 + 2, style: "font-size: 0.8em" } );
		te.headline.textContent = text;
		te.el.appendChild(te.headline);
		
		te.clock = svg.makeEl("text", { "text-anchor": "end", fill: theme.textcolor, x: te.width - 2, y: svg.em * 0.8 + 2, style: "font-size: 0.8em" } );
		te.el.appendChild(te.clock);
	}
	
	that.drawTimelineEventBackground = function(te, noclip) {
		te.bkg = svg.makeRect(theme.Timeline_leftsidesize + 1, 0, te.width - theme.Timeline_leftsidesize - 1, te.height);
		te.bkg.setAttribute("transform", "translate(0, " + (svg.em * 0.8 + 4) + ")");
		//te.bkg.setAttribute("fill", "url(#TimelineSong_titlebkg)");
		te.bkg.setAttribute("fill", that.primarybkg);
		if (!noclip) te.bkg.setAttribute("clip-path", "url(#songnumx_clip)");
		else te.bkg.setAttribute("clip-path", "url(#songnumx_basicclip)");
		te.el.appendChild(te.bkg);
	};
	
	that.Extend.TimelineElection = function(te) {
		te.draw = function() {
			that.drawTimelineEventHeader(te, _l("election"), theme.primarybkg, "url(#TimelineSong_indnormal)", theme.indicnormal);
			that.drawTimelineEventBackground(te);
			te.bkgfx = fx.make(fx.SVGAttrib, [ te.bkg, 500, "height", "" ]);
			te.bkgfx.set(te.height);
			te.bkgfx.onComplete = te.fixElHeight;
			
			te.topfx = fx.make(fx.CSSNumeric, [ te.el, 700, "top", "px" ]);
			te.topfx.set(te.container.offsetHeight);
			te.leftfx = fx.make(fx.CSSNumeric, [ te.el, 700, "left", "px" ]);
			te.leftfx.set(0);
		};
		
		te.detectHeaderColor = function() {
			var reqstatus = 0;
			for (var i = 0; i < te.songs.length; i++) {
				if (te.songs[i].p.elec_isrequest == 1) {
					reqstatus = 1;
					break;
				}
			}
			var gradurl = reqstatus == 1 ? "url(#TimelineSong_indrequest)" : "url(#TimelineSong_indnormal)";
			var bkgfill = reqstatus == 1 ? theme.indicrequest : theme.indicnormal;
			te.headlinegrad.setAttribute("fill", gradurl);
			te.headlinebkg.setAttribute("fill", bkgfill);
		};

		te.changeHeadline = function(newtext) {
			te.headline.textContent = newtext;
		};

		te.drawAsCurrent = function() {
			te.headline.textContent = _l("electionresults");
			te.clock.textContent = "";
			te.clockdisplay = false;
		};

		te.drawShowWinner = function() {
			te.headline.textContent = _l("previouslyplayed");
		};

		te.moveTo = function(y) {
			te.topfx.start(y);
		};
		
		te.moveXTo = function(x) {
			te.leftfx.start(x);
		};
		
		te.hideX = function() {
			te.leftfx.set(-parseInt(te.el.getAttribute("width")))
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
			te.el.removeChild(te.clock);
		};

		te.drawHeightChanged = function() {
			te.bkgfx.start(te.height - 12);
		};
		
		te.fixElHeight = function() {
			te.el.setAttribute("height", te.height);
		}
	};
	
	that.Extend.TimelineAdSet = function(tas) {
		tas.draw = function() {
			var indicator = svg.makeEl("path", { d: "M0,0 H" + theme.Timeline_leftsidesize + " V" + (theme.TimelineSong_rowheight - 1) + " L0," + (theme.TimelineSong_rowheight - theme.Timeline_leftsidesize - 1) + " Z", fill: "url(#TimelineSong_indnormal)" } );
			indicator.setAttribute("transform", "translate(0, " + (svg.em + 3) + ")");
			tas.el.appendChild(indicator);
			
			that.drawTimelineEventHeader(tas, _l("adset"), theme.primarybkg, "url(#TimelineSong_indnormal)", theme.indicnormal);
			that.drawTimelineEventBackground(tas, true);
			
			var txt;
			for (var i = 0; i < tas.p.ad_data.length; i++) {
				txt = svg.makeEl("text", { "x": theme.Timeline_leftsidesize + 4, "y": 12 + (theme.TimelineSong_rowheight * (i + 1)) - 4, "textContent": tas.p.ad_data[i].ad_title, "fill": that.textcolor });
				svg.linkifyText(txt, tas.p.ad_data[i].ad_url);
				tas.el.appendChild(txt);
			}

			tas.topfx = fx.make(fx.CSSNumeric, [ tas.el, 700, "top", "px" ]);
			tas.topfx.set(tas.container.offsetHeight);
			tas.leftfx = fx.make(fx.CSSNumeric, [ tas.el, 700, "left", "px" ]);
			tas.leftfx.set(0);
		};

		tas.changeHeadline = function(newtext) {
			tas.headline.textContent = newtext;
		};

		tas.drawAsCurrent = function() {
			tas.headline.textContent = _l("nowplaying");
			tas.clock.textContent = "";
			tas.clockdisplay = false;
		};

		tas.drawShowWinner = function() {
			tas.headline.textContent = _l("previouslyplayed");
		};

		tas.moveTo = function(y) {
			tas.topfx.start(y);
		};
		
		tas.moveXTo = function(x) {
			tas.leftfx.start(x);
		};
		
		tas.hideX = function() {
			tas.leftfx.set(-parseInt(te.el.getAttribute("width")))
		};
		
		tas.setY = function(y) {
			tas.topfx.set(y);
		};
		
		tas.setX = function(x) {
			tas.leftfx.set(x);
		};
		
		tas.changeZ = function(z) {
			tas.el.style.zIndex = z;
		};
		
		tas.clockUndraw = function() {
			tas.el.removeChild(tas.clock);
		};

		tas.drawHeightChanged = function() {
			tas.el.setAttribute("height", tas.height);
		};	
	};
	
	that.Extend.TimelineLiveShow = function(tls) {
		tls.draw = function() {
			tls.height = svg.em + that.TimelineSong_height;
			
			var indicator = svg.makeEl("path", { d: "M0,0 H" + theme.Timeline_leftsidesize + " V" + (theme.TimelineSong_rowheight - 1) + " L0," + (theme.TimelineSong_rowheight - theme.Timeline_leftsidesize - 1) + " Z", fill: "url(#TimelineSong_indnormal)" } );
			indicator.setAttribute("transform", "translate(0, " + (svg.em + 3) + ")");
			tls.el.appendChild(indicator);
			
			that.drawTimelineEventHeader(tls, _l("liveshow"), theme.primarybkg, "url(#TimelineSong_indnormal)", that.indicnormal);
			that.drawTimelineEventBackground(tls, true);
			
			var baseline = svg.em * 2.6;
			var room = tls.parent.width - theme.Timeline_leftsidesize - theme.Rating_width;
			
			tls.titleel = svg.makeEl("text", { x: (theme.Timeline_leftsidesize + 5), y: baseline, fill: theme.textcolor, textContent: fitText(tls.p.sched_name, (room - (svg.em * 5.4))) } );
			tls.el.appendChild(tls.titleel);
			
			tls.noteel = svg.makeEl("text", { x: (theme.Timeline_leftsidesize + 16), y: (theme.TimelineSong_rowheight + baseline), fill: theme.darktext, textContent: fitText(tls.p.sched_notes, room - 16 - svg.em) } );
			tls.el.appendChild(tls.noteel);
			
			tls.userel = svg.makeEl("text", { x: (theme.Timeline_leftsidesize + 16), y: ((theme.TimelineSong_rowheight * 2) + baseline), fill: theme.darktext, textContent: tls.p.username }); 
			tls.el.appendChild(tls.userel);

			tls.topfx = fx.make(fx.CSSNumeric, [ tls.el, 700, "top", "px" ]);
			tls.topfx.set(tls.container.offsetHeight);
		};

		tls.changeHeadline = function(newtext) {
			tls.headline.textContent = newtext;
		};

		tls.drawAsCurrent = function() {
			tls.headline.textContent = _l("nowplaying");
			tls.clock.textContent = "";
			tls.clockdisplay = false;
		};

		tls.drawShowWinner = function() {
			tls.headline.textContent = _l("previouslyplayed");
		};

		tls.moveTo = function(y) {
			tls.topfx.start(y);
		};
		
		tls.moveXTo = function(x) {
			tls.leftfx.start(x);
		};
		
		tls.hideX = function() {
			tls.leftfx.set(-parseInt(tls.el.getAttribute("width")))
		};
		
		tls.setY = function(y) {
			tls.topfx.set(y);
		};
		
		tls.setX = function(x) {
			tls.leftfx.set(x);
		};
		
		tls.changeZ = function(z) {
			tls.el.style.zIndex = z;
		};
		
		tls.clockUndraw = function() {
			tls.el.removeChild(tls.clock);
		};

		tls.drawHeightChanged = function() {
			tls.el.setAttribute("height", tls.height);
		}
	
	};
	
	that.Extend.TimelinePlaylist = function(tpl) {
		tpl.draw = function() {
			that.drawTimelineEventHeader(tpl, _l("playlist") + tpl.p.playlist_name, theme.primarybkg, "url(#TimelineSong_indnormal)", theme.indicnormal);
			that.drawTimelineEventBackground(tpl);
			tpl.bkgfx = fx.make(fx.SVGAttrib, [ te.bkg, 500, "height", "" ]);
			tpl.bkgfx.set(te.height);
			tpl.bkgfx.onComplete = te.fixElHeight;
			
			tpl.topfx = fx.make(fx.CSSNumeric, [ te.el, 700, "top", "px" ]);
			tpl.topfx.set(te.container.offsetHeight);
		};
		
		tpl.changeHeadline = function(newtext) {
			tpl.headline.textContent = newtext;
		};

		tpl.drawAsCurrent = function() {
			tpl.headline.textContent = _l("nowplaying");
			tpl.clock.textContent = "";
			tpl.clockdisplay = false;
		};

		tpl.drawShowWinner = function() {
			tpl.headline.textContent = _l("previouslyplayed");
		};

		tpl.moveTo = function(y) {
			tpl.topfx.start(y);
		};
		
		tpl.moveXTo = function(x) {
			tpl.leftfx.start(x);
		};
		
		tpl.hideX = function() {
			tpl.leftfx.set(-parseInt(tpl.el.getAttribute("width")))
		};
		
		tpl.setY = function(y) {
			tpl.topfx.set(y);
		};
		
		tpl.setX = function(x) {
			tpl.leftfx.set(x);
		};
		
		tpl.changeZ = function(z) {
			tpl.el.style.zIndex = z;
		};
		
		tpl.clockUndraw = function() {
			tpl.el.removeChild(tpl.clock);
		};

		tpl.drawHeightChanged = function() {
			tpl.bkgfx.start(tpl.height - 12);
		};
		
		tpl.fixElHeight = function() {
			tpl.el.setAttribute("height", tpl.height);
		}
	};
	
	that.Extend.TimelineOneShot = function(tos) {
		tos.draw = function() {
			var hltitle = _l("onetimeplay");
			if (tos.p.user_id) hltitle += " from " + tos.p.username;
			that.drawTimelineEventHeader(tos, hltitle, theme.primarybkg, "url(#TimelineSong_indnormal)", theme.indicnormal);
			that.drawTimelineEventBackground(tos);
			tos.bkgfx = fx.make(fx.SVGAttrib, [ tos.bkg, 500, "height", "" ]);
			tos.bkgfx.set(tos.height);
			tos.bkgfx.onComplete = tos.fixElHeight;
			
			if (tos.p.user_id == user.p.user_id) {
				tos.headline.textContent = _l("deleteonetime");
				tos.headline.style.cursor = "pointer";
				tos.headline.addEventListener("click", tos.deleteOneShot, true);
			}

			tos.topfx = fx.make(fx.CSSNumeric, [ tos.el, 700, "top", "px" ]);
			tos.topfx.set(tos.container.offsetHeight);
		};

		tos.changeHeadline = function(newtext) {
			tos.headline.textContent = newtext;
		};

		tos.drawAsCurrent = function() {
			tos.headline.textContent = _l("nowplaying");
			tos.clock.textContent = "";
			tos.clockdisplay = false;
		};

		tos.drawShowWinner = function() {
			tos.headline.textContent = _l("previouslyplayed");
		};

		tos.moveTo = function(y) {
			tos.topfx.start(y);
		};
		
		tos.moveXTo = function(x) {
			tos.leftfx.start(x);
		};
		
		tos.hideX = function() {
			tos.leftfx.set(-parseInt(tos.el.getAttribute("width")))
		};
		
		tos.setY = function(y) {
			tos.topfx.set(y);
		};
		
		tos.setX = function(x) {
			tos.leftfx.set(x);
		};
		
		tos.changeZ = function(z) {
			tos.el.style.zIndex = z;
		};
		
		tos.clockUndraw = function() {
			tos.el.removeChild(tos.clock);
		};

		tos.drawHeightChanged = function() {
			tos.bkgfx.start(tos.height - 12);
		};
		
		tos.fixElHeight = function() {
			tos.el.setAttribute("height", tos.height);
		}
	};

	/*****************************************************************************
	TIMELINE SONG
	*****************************************************************************/
	
	that.Extend.TimelineSong = function(ts) {
		ts.draw = function() {
			var baseline = svg.em + 5;		// text baseline vertical pixel
			var room = ts.parent.width - theme.Timeline_leftsidesize - theme.Rating_width;

			ts.indicatorclip = svg.makeEl("g", { clip_path: "url(#songnumx_xclip)" } );
			ts.indicatorg = svg.makeEl("g");
			ts.indicatefx = fx.make(fx.SVGTranslateY, [ ts.indicatorg, 250, 0 ]);
			ts.indicatefx.set(theme.TimelineSong_rowheight);
			ts.isreq = ts.p['elec_isrequest'];
			var indicbkg = "#TimelineSong_indnormal";
			var indicbright = theme.indicnormalbright;
			var pcolour = "#2c9eff";
			if (ts.isreq == 1) {
			//if (ts.songnum == 0) {
				indicbkg = "#TimelineSong_indrequest";
				indicbright = theme.indicrequestbright;
				pcolour = "#2cff40";
			}
			else if (ts.isreq == -2) {
			//else if (ts.songnum == 1) {
				indicbkg = "#TimelineSong_inddconflict";
				indicbright = theme.indicconflictbright;
				pcolour = "#fcfa66";
			}
			else if (ts.isreq == -1) {
			//else if (ts.songnum == 2) {
				indicbkg = "#TimelineSong_inddconflict";
				indicbright = theme.indicconflictbright;
				pcolour = "#ff7d4f";
			}
			var indicbkgr = "url(" + indicbkg + "r)";
			var indicbkgp = "url(" + indicbkg + "_progress)";
			indicbkg = "url(" + indicbkg + ")";

			var indicbkgrect = svg.makeEl("path", { d: "M0,0 H" + theme.Timeline_leftsidesize + " V" + (theme.TimelineSong_rowheight * 2) + " L0," + ((theme.TimelineSong_rowheight * 2) - theme.Timeline_leftsidesize) + " Z", fill: theme.primarybkg } );
			ts.indicatorg.appendChild(indicbkgrect);
			var indicator = svg.makeEl("path", { d: "M0,0 H" + theme.Timeline_leftsidesize + " V" + (theme.TimelineSong_rowheight * 2) + " L0," + ((theme.TimelineSong_rowheight * 2) - theme.Timeline_leftsidesize) + " Z", fill: indicbkg } );
			ts.indicatorg.appendChild(indicator);
			ts.indicatorg.appendChild(svg.makeRect(theme.Timeline_leftsidesize, theme.TimelineSong_rowheight, (ts.parent.width - theme.Timeline_leftsidesize), theme.TimelineSong_rowheight, { fill: indicbkgr } ));
			if (ts.isreq == 1) {
				var reqtext = svg.makeEl("text", { fill: theme.textcolor, x: theme.Timeline_leftsidesize + 16, y: theme.TimelineSong_rowheight + baseline } );
				reqtext.textContent = fitText(_l("requestedby") + " " + ts.p.song_requestor + ".", room - 16 - svg.em);
				ts.indicatorg.appendChild(reqtext);
			}
			else if (ts.isreq == -3) {
				var reqtext = svg.makeEl("text", { fill: theme.textcolor, x: theme.Timeline_leftsidesize + 16, y: theme.TimelineSong_rowheight + baseline } );
				reqtext.textContent = fitText(_l("conflictswith") + " " + ts.p.song_requestor + ".", room - 16 - svg.em);
				ts.indicatorg.appendChild(reqtext);
			}
			ts.indicatorclip.appendChild(ts.indicatorg);
			
			ts.votehoverg = svg.makeEl("g");
			var voterect = svg.makeRect(theme.Timeline_leftsidesize + 1, 1, (ts.parent.width - theme.Timeline_leftsidesize - 1), (theme.TimelineSong_rowheight - 1), { fill: indicbkgr } );
			ts.votehoverg.appendChild(voterect);
			
			/*ts.particletimer = false;
			ts.particles = new Array();
			for (var i = 0; i < theme.TimelineSong_rowheight; i++) {
				var x = Math.floor(Math.random() * (ts.parent.width - theme.Timeline_leftsidesize + 1));
				ts.particles[i] = svg.makeLine(x, theme.TimelineSong_rowheight + i, x, theme.TimelineSong_rowheight, { stroke: pcolour, stroke_width: 1, shape_rendering: "crispEdges" } );
				ts.votehoverg.appendChild(ts.particles[i]);
			}*/
			
			ts.FxVoteHoverOpacity = fx.make(fx.SVGAttrib, [ ts.votehoverg, 250, "opacity", "" ]);
			ts.FxVoteHoverOpacity.set(0);
			
			ts.el.appendChild(ts.votehoverg);
			
			ts.voteprogress = svg.makeEl("path", { fill: indicbkgp, clip_path: "url(#songnumx_songclip)" });
			ts.el.appendChild(ts.voteprogress);
			ts.FxVoteProgress = fx.make(fx.TimelineSong_voteProgress, [ ts.voteprogress, 250 ] );
			
			ts.voteconfirmg = svg.makeEl("g", { clip_path: "url(#songnumx_songclip)" } );
			ts.voteconfirm = svg.makeRect(theme.Timeline_leftsidesize, 0, ts.parent.width, theme.TimelineSong_rowheight, { fill: indicbright } );
			ts.voteconfirmg.appendChild(ts.voteconfirm);
			ts.el.appendChild(ts.voteconfirmg);
			ts.FxVoteConfirmOpacity = fx.make(fx.SVGAttrib, [ ts.voteconfirm, 600, "opacity", "" ]);
			ts.FxVoteConfirmOpacity.set(1);
			ts.FxVoteConfirm = fx.make(fx.SVGAttrib, [ ts.voteconfirm, 200, "y", "" ]);
			ts.FxVoteConfirm.onComplete = ts.registerVoteDraw2;
			ts.FxVoteConfirm.set(theme.TimelineSong_rowheight);
			
			// ts.song is defined (and filled with song data) by Edi.  ts.songel is not required, but I use it. :)
			ts.songel = svg.makeEl("text", { x: (theme.Timeline_leftsidesize + 5), y: baseline, fill: theme.textcolor, "width": ts.parent.width } );
			ts.songel.textContent = fitText(ts.p.song_title, (room - (svg.em * 5.4)));
			ts.el.appendChild(ts.songel);

			ts.songtime = svg.makeEl("text", { "text-anchor": "end", x: (room - 7), y: baseline, fill: theme.darktext } );
			ts.songtime.textContent = formatTime(ts.p.song_secondslong);
			ts.el.appendChild(ts.songtime);
			
			ts.timeborders = new Array();
			for (var i = 0; i < 2; i++) {
				ts.timeborders[i] = svg.makeEl("path", { opacity: 0.3, fill: "#000000" } );
				ts.timeborders[i].setAttribute("d", "M" + Math.floor(ts.parent.width - theme.Rating_width - theme.TimelineSong_rowheight) + "," + Math.floor((theme.TimelineSong_rowheight * i) + 1) + " H" + (ts.parent.width - 1) + " V" + Math.floor(theme.TimelineSong_rowheight * (i + 1)) + " H" + (ts.parent.width - theme.Rating_width) + " Z");
				ts.el.appendChild(ts.timeborders[i]);
			}

			// ts.songrating required by Edi
			ts.songrating = Rating({ category: "song", id: ts.p.song_id, userrating: ts.p.song_rating_user, siterating: ts.p.song_rating_avg, x: (ts.parent.width - theme.Rating_width), y: 3, favourite: ts.p.song_favourite, register: true });
			ts.el.appendChild(ts.songrating.el);
			
			ts.albumg = svg.makeEl("g");
			// ts.album is defined by Edi, you must define ts.albumel here for the album to be clickable (for info)
			ts.albumel = svg.makeEl("text", { x: (theme.Timeline_leftsidesize + 16), y: (theme.TimelineSong_rowheight + baseline), fill: theme.darktext } );
			ts.albumel.textContent = fitText(ts.p.album_name, room - 16 - svg.em);
			ts.el.appendChild(ts.albumel);
			
			// ts.albumrating required by Edi
			ts.albumrating = Rating({ category: "album", id: ts.p.album_id, userrating: ts.p.album_rating_user, siterating: ts.p.album_rating_avg, x: (ts.parent.width - theme.Rating_width), y: (theme.TimelineSong_rowheight + 3), favourite: ts.p.album_favourite, register: true });
			ts.el.appendChild(ts.albumrating.el);
			
			// indicatorclip HAS TO GO HERE since it needs to go over the album on hover
			ts.el.appendChild(ts.indicatorclip);
			ts.indicatefx.set(-theme.TimelineSong_rowheight);
			
			// note how we're using tspans for each artist's element, ts allows properly display of the text in 1 line while
			// retaining the ability to have each artist have its own link
			var artisttext = svg.makeEl("text", { x: (theme.Timeline_leftsidesize + 16), y: ((theme.TimelineSong_rowheight * 2) + baseline), fill: theme.darktext } );
			// ts.p.artists is defined and filled by Edi, as is artistsToTSpans (also handles artist clickability!)
			artistsToTSpans(artisttext, ts.p.artists);
			ts.artistel = artisttext;
			fitTSpans(ts.artistel, (ts.parent.width - theme.Timeline_leftsidesize - 17), false);
			ts.el.appendChild(ts.artistel);
			
			ts.voteswipeg = svg.makeEl("g", { clip_path: "url(#songnumx_songclip)" } );
			ts.voteswipe = svg.makeRect(theme.Timeline_leftsidesize, 1, ts.parent.width, theme.TimelineSong_rowheight - 1, { fill: "url(#TimelineSong_voteswipe)" } );
			ts.voteswipeg.appendChild(ts.voteswipe);
			ts.el.appendChild(ts.voteswipeg);
			ts.FxVoteSwipe = fx.make(fx.SVGAttrib, [ ts.voteswipe, 400, "y", "" ]);
			ts.FxVoteSwipe.set(-theme.TimelineSong_rowheight);
			
			// ts.votehoverel required for interactivity.
			ts.votehoverel = svg.makeRect(theme.Timeline_leftsidesize, 0, room - svg.em, theme.TimelineSong_rowheight, { fill: "#FFFFFF", opacity: 0 } );
			ts.el.appendChild(ts.votehoverel);
			
			ts.artistfade = fx.make(fx.SVGAttrib, [ ts.artistel, 250, "opacity", "" ]);
			ts.artistfade.onComplete = ts.removeArtist;
			ts.artistfade.set(1);
			
			if (prefs.p.timeline.highlightrequests.value && (ts.p.elec_isrequest != 0)) {
				ts.voteHoverOn();
			}
		};

		ts.destruct = function() {
			ts.songrating.destruct();
			ts.albumrating.destruct();
		};

		ts.showVotes = function() {
			if (ts.p.elec_votes > 0) {
				ts.songtime.textContent = ts.p.elec_votes;
			}
			else {
				ts.songtime.textContent = "";
			}
		};

		ts.showSongLengths = function() {
			ts.songtime.textContent = formatNumberToMSS(ts.p.song_secondslong);
		};

		ts.showSongAlbum = function() {
			ts.height = theme.TimelineSong_rowheight * 2;
			ts.artistfade.start(0);
		};

		ts.removeArtist = function() {
			try { ts.el.removeChild(ts.artistel); } catch(err) {}
			ts.height = theme.TimelineSong_rowheight * 2;
		};

		ts.voteHoverOn = function(evt) {
			/*for (var i = 0; i < ts.particles.length; i++) { ts.particleCalculate(i); }
			if (ts.particletimer != false) clearInterval(ts.particletimer);
			ts.particletimer = setInterval(ts.particleAnimate, 40);*/
			ts.FxVoteHoverOpacity.start(1);
			if (ts.isreq != 0) ts.indicatefx.start(0);
		};

		ts.voteHoverOff = function(evt) {
			ts.FxVoteHoverOpacity.start(0);
			ts.indicatefx.start(-theme.TimelineSong_rowheight);
			//clearInterval(ts.particletimer);
			//ts.particletimer = false;
		};

		ts.startVoting = function() {
			ts.FxVoteSwipe.start(theme.TimelineSong_rowheight, -theme.TimelineSong_rowheight);
			ts.startedvoting = clock.hiResTime();
			ts.voteprogresstimer = setInterval(ts.voteProgress, 20);
		};

		ts.voteProgress = function() {
			var clocktime = clock.hiResTime();
			if ((ts.startedvoting + 5000) >= clocktime) {
				var headtime = (Math.floor(((ts.startedvoting + 5000) - clocktime) / 100) / 10);
				if ((headtime % 1) == 0) headtime += ".0";
				ts.parent.changeHeadline(_l("votelockingin") + " " + headtime + "...");
				var x = ((clocktime - ts.startedvoting) / 5000) * (ts.parent.width - theme.Timeline_leftsidesize - theme.Rating_width - 8);
				ts.FxVoteProgress.set(x);
			}
			else {
				ts.parent.changeHeadline("Submitting vote...");
				ts.voteProgressComplete();
				ts.voteSubmit();
			}
		};

		ts.voteProgressStop = function() {
			clearInterval(ts.voteprogresstimer);
			ts.FxVoteProgress.start(-theme.TimelineSong_rowheight);
		};

		ts.voteProgressComplete = function() {
			clearInterval(ts.voteprogresstimer);
			ts.FxVoteProgress.set(ts.parent.width - theme.Timeline_leftsidesize - theme.Rating_width - 8);
		};

		ts.registerVoteDraw = function() {
			ts.parent.changeHeadline(_l("voted"));
			ts.FxVoteConfirm.start(0);
		};

		ts.registerVoteDraw2 = function() {
			//ts.FxVoteConfirmOpacity.onComplete = ts.registerVoteDraw3;
			ts.FxVoteConfirmOpacity.start(0.25);
			ts.FxVoteProgress.set(-theme.TimelineSong_rowheight);
		};
		
		/*ts.registerVoteDraw3 = function() {
			ts.FxVoteConfirmOpacity.onComplete = false;
		};*/

		ts.particleCalculate = function(i) {
			if (ts.particles[i].getAttribute("y2") <= 0) {
				ts.particles[i].setAttribute("y1", theme.TimelineSong_rowheight);
				var x = Math.floor(Math.random() * (ts.parent.width - theme.Timeline_leftsidesize - theme.Rating_width)) + theme.Timeline_leftsidesize;
				ts.particles[i].setAttribute("x1", x)
				ts.particles[i].setAttribute("x2", x)
			}
			var y1 = parseInt(ts.particles[i].getAttribute("y1"));
			if (y1 > theme.TimelineSong_rowheight) ts.particles[i].setAttribute("opacity", "0");
			else if (y1 < (theme.TimelineSong_rowheight)) {
				ts.particles[i].setAttribute("opacity", (y1 / theme.TimelineSong_rowheight));
			}
			else {
				ts.particles[i].setAttribute("opacity", "1");
			}
			ts.particles[i].setAttribute("y1", y1 - 2);
			var y2 = y1 + (theme.TimelineSong_rowheight / 3);
			if (y2 > theme.TimelineSong_rowheight) y2 = theme.TimelineSong_rowheight;
			ts.particles[i].setAttribute("y2", y2);
		};

		ts.particleAnimate = function() {
			for (var i = 0; i < ts.particles.length; i++) {
				ts.particleCalculate(i);
			}
			//if (ts.particletimer == true) setTimeout(ts.particleAnimate, 100);
		};
		
		return ts;
	};

	that.timelineSongDefs = function(svgel, defs) {
		var titlebkg = svg.makeGradient("linear", "TimelineSong_titlebkg", "0%", "0%", "0%", "100%", "pad");
		titlebkg.appendChild(svg.makeStop("0%", that.brightbkg, "1"));
		titlebkg.appendChild(svg.makeStop("33%", that.primarybkg, "1"));
		defs.appendChild(titlebkg);

		var inddconflict = svg.makeGradient("linear", "TimelineSong_inddconflict", "100%", "0%", "0%", "0%", "pad");
		inddconflict.appendChild(svg.makeStop("0%", that.indicconflict, "1"));
		inddconflict.appendChild(svg.makeStop("100%", that.indicconflict, "0.3"));
		defs.appendChild(inddconflict);
		
		var inddconflictr = svg.makeGradient("linear", "TimelineSong_inddconflictr", "0%", "0%", "100%", "0%", "pad");
		inddconflictr.appendChild(svg.makeStop("70%", that.indicconflict, "1"));
		inddconflictr.appendChild(svg.makeStop("100%", that.indicconflict, "0.3"));
		defs.appendChild(inddconflictr);
		
		var inddconflictv = svg.makeGradient("linear", "TimelineSong_inddconflictv", "0%", "100%", "0%", "0%", "pad");
		inddconflictv.appendChild(svg.makeStop("0%", that.indicconflict, "1"));
		inddconflictv.appendChild(svg.makeStop("100%", that.indicconflict, "0.3"));
		defs.appendChild(inddconflictv);
		
		var inddconflictp = svg.makeGradient("linear", "TimelineSong_inddconflict_progress", "0%", "0%", "0%", "100%", "pad");
		inddconflictp.appendChild(svg.makeStop("0%", that.indicconflict, "0"));
		inddconflictp.appendChild(svg.makeStop("50%", that.indicconflict, "0"));
		inddconflictp.appendChild(svg.makeStop("90%", that.indicconflict, "1"));
		inddconflictp.appendChild(svg.makeStop("100%", that.indicconflictbright, "1"));
		defs.appendChild(inddconflictp);
		
		/*var indqconflict = svg.makeGradient("linear", "TimelineSong_indqconflict", "100%", "0%", "0%", "0%", "pad");
		indqconflict.appendChild(svg.makeStop("0%", that.indicwarn, "1"));
		indqconflict.appendChild(svg.makeStop("100%", that.indicwarn, "0.3"));
		defs.appendChild(indqconflict);
		
		var indqconflictr = svg.makeGradient("linear", "TimelineSong_indqconflictr", "0%", "0%", "100%", "0%", "pad");
		indqconflictr.appendChild(svg.makeStop("70%", that.indicwarn, "1"));
		indqconflictr.appendChild(svg.makeStop("100%", that.indicwarn, "0.3"));
		defs.appendChild(indqconflictr);
		
		var indqconflictv = svg.makeGradient("linear", "TimelineSong_indqconflictv", "0%", "100%", "0%", "0%", "pad");
		indqconflictv.appendChild(svg.makeStop("0%", that.indicwarn, "1"));
		indqconflictv.appendChild(svg.makeStop("100%", that.indicwarn, "0.3"));
		defs.appendChild(indqconflictv);*/
		
		var indrequest = svg.makeGradient("linear", "TimelineSong_indrequest", "100%", "0%", "0%", "0%", "pad");
		indrequest.appendChild(svg.makeStop("0%", that.indicrequest, "1"));
		indrequest.appendChild(svg.makeStop("100%", that.indicrequest, "0.3"));
		defs.appendChild(indrequest);
		
		var indrequestr = svg.makeGradient("linear", "TimelineSong_indrequestr", "0%", "0%", "100%", "0%", "pad");
		indrequestr.appendChild(svg.makeStop("70%", that.indicrequest, "1"));
		indrequestr.appendChild(svg.makeStop("100%", that.indicrequest, "0.3"));
		defs.appendChild(indrequestr);
		
		var indrequestv = svg.makeGradient("linear", "TimelineSong_indrequestv", "0%", "100%", "0%", "0%", "pad");
		indrequestv.appendChild(svg.makeStop("0%", that.indicrequest, "1"));
		indrequestv.appendChild(svg.makeStop("100%", that.indicrequest, "0.3"));
		defs.appendChild(indrequestv);
		
		var indrequestp = svg.makeGradient("linear", "TimelineSong_indrequest_progress", "0%", "0%", "0%", "100%", "pad");
		indrequestp.appendChild(svg.makeStop("0%", that.indicrequest, "0"));
		indrequestp.appendChild(svg.makeStop("50%", that.indicrequest, "0"));
		indrequestp.appendChild(svg.makeStop("90%", that.indicrequest, "1"));
		indrequestp.appendChild(svg.makeStop("100%", that.indicrequestbright, "1"));
		defs.appendChild(indrequestp);
		
		var indnormal = svg.makeGradient("linear", "TimelineSong_indnormal", "100%", "0%", "0%", "0%", "pad");
		indnormal.appendChild(svg.makeStop("0%", that.indicnormal, "1"));
		indnormal.appendChild(svg.makeStop("100%", that.indicnormal, "0.3"));
		defs.appendChild(indnormal);
		
		var indnormalr = svg.makeGradient("linear", "TimelineSong_indnormalr", "0%", "0%", "100%", "0%", "pad");
		indnormalr.appendChild(svg.makeStop("70%", that.indicnormal, "1"));
		indnormalr.appendChild(svg.makeStop("100%", that.indicnormal, "0.3"));
		defs.appendChild(indnormalr);
		
		var indnormalv = svg.makeGradient("linear", "TimelineSong_indnormalv", "0%", "100%", "0%", "0%", "pad");
		indnormalv.appendChild(svg.makeStop("0%", that.indicnormal, "1"));
		indnormalv.appendChild(svg.makeStop("100%", that.indicnormal, "0.3"));
		defs.appendChild(indnormalv);
		
		var voteprogress = svg.makeGradient("linear", "TimelineSong_indnormal_progress", "0%", "0%", "0%", "100%", "pad");
		voteprogress.appendChild(svg.makeStop("0%", that.indicnormal, "0"));
		voteprogress.appendChild(svg.makeStop("50%", that.indicnormal, "0"));
		voteprogress.appendChild(svg.makeStop("90%", that.indicnormal, "1"));
		voteprogress.appendChild(svg.makeStop("100%", that.indicnormalbright, "1"));
		defs.appendChild(voteprogress);
		
		var voteswipe = svg.makeGradient("linear", "TimelineSong_voteswipe", "0%", "0%", "0%", "100%", "pad");
		voteswipe.appendChild(svg.makeStop("0%", "white", "0"));
		voteswipe.appendChild(svg.makeStop("33%", "white", "1"));
		voteswipe.appendChild(svg.makeStop("66%", "white", "1"));
		voteswipe.appendChild(svg.makeStop("100%", "white", "0"));
		defs.appendChild(voteswipe);
	};

	that.TimelineSongClipPath = function(svgel, obj) {
		// should equal 183!
		var border = svg.makeEl("clipPath");
		border.setAttribute("id", "songnumx_clip");
		var bpath = svg.makeEl("path");
		var path = "";
		for (var j = 0; j < 3; j++) {
			var basey = j * that.TimelineSong_height;
			// first step: create the upper left box
			path += "M1," + (basey + 1) + " V" + Math.floor(basey + (that.TimelineSong_leftclipext * that.TimelineSong_rowheight) - that.Timeline_leftsidesize) + " L" + that.Timeline_leftsidesize + "," + Math.floor(basey + (that.TimelineSong_leftclipext * that.TimelineSong_rowheight)) + " V" + (basey + 1) + " Z";
			for (var i = 0; i < 2; i++) {
				// the song/album clip - ALSO USED BELOW
				path += " M" + Math.floor(that.Timeline_leftsidesize + 1) + "," + Math.floor(basey + (that.TimelineSong_rowheight * i) + 1) + " H" + Math.floor(obj.width - that.Rating_width - that.TimelineSong_rowheight + 1) + " L" + Math.floor(obj.width - that.Rating_width) + "," + Math.floor(basey + (that.TimelineSong_rowheight * (i + 1))) + " H" + Math.floor(that.Timeline_leftsidesize + 1) + " Z";
				// the rating clip
				path += " M" + Math.floor(obj.width - that.Rating_width - that.TimelineSong_rowheight + 2) + "," + Math.floor(basey + (that.TimelineSong_rowheight * i) + 1) + " H" + (obj.width - 1) + " V" + Math.floor(basey + (that.TimelineSong_rowheight * (i + 1))) + " H" + Math.floor(obj.width - that.Rating_width + 1) + " Z";
			}
			// artist clip
			path += " M" + Math.floor(that.Timeline_leftsidesize + 1) + "," + Math.floor(basey + (that.TimelineSong_rowheight * 2) + 1) + " H" + Math.floor(obj.width - 1) + " V" + Math.floor(basey + (that.TimelineSong_rowheight * 3)) + " H" + Math.floor(that.Timeline_leftsidesize + 1) + " Z";			
		}
		bpath.setAttribute("d", path);
		bpath.setAttribute("shape-rendering", "crispEdges");
		border.appendChild(bpath);
		svgel.appendChild(border);
		
		var border2 = svg.makeEl("clipPath", { id: "songnumx_xclip" } );
		var bpath2 = svg.makeEl("path", { shape_rendering: "crispEdges", d: "M0,1 H" + that.Timeline_leftsidesize + " V" + (that.TimelineSong_rowheight + 1) + " H" + obj.width + " V" + (that.TimelineSong_rowheight * 2) + " H0 Z" } );
		border2.appendChild(bpath2);
		svgel.appendChild(border2);	
		
		var border3 = svg.makeEl("clipPath", { id: "songnumx_songclip" } );
		var bpath3 = svg.makeEl("path", { shape_rendering: "crispEdges", d: "M" + Math.floor(that.Timeline_leftsidesize + 1) + "," + 1 + " H" + Math.floor(obj.width - that.Rating_width - that.TimelineSong_rowheight + 1) + " L" + Math.floor(obj.width - that.Rating_width) + "," + (that.TimelineSong_rowheight) + " H" + Math.floor(that.Timeline_leftsidesize + 1) + " Z" } );
		border3.appendChild(bpath3);
		svgel.appendChild(border3);
		
		var border4 = svg.makeEl("clipPath", { "id": "songnumx_basicclip" });
		/*var bpath4;
		for (var j = 0; j < 5; j++) {
			bpath4 = svg.makeEl("path", { shape_rendering: "crispEdges", d: "M" + Math.floor(that.Timeline_leftsidesize + 1) + "," + (1 + (that.TimelineSong_rowheight * j)) + " H" + (obj.width - 1) + " V" + (that.TimelineSong_rowheight * (j + 1)) + " H" + Math.floor(that.Timeline_leftsidesize + 1) + " Z " } );	
			border4.appendChild(bpath4);
		}*/
		var bpath4 = "";
		for (var j = 0; j < 5; j++) {
			bpath4 += " M" + Math.floor(that.Timeline_leftsidesize + 1) + "," + (1 + (that.TimelineSong_rowheight * j)) + " H" + (obj.width - 1) + " V" + (that.TimelineSong_rowheight * (j + 1)) + " H" + Math.floor(that.Timeline_leftsidesize + 1) + " Z ";	
		}
		border4.appendChild(svg.makeEl("path", { shape_rendering: "crispEdges", d: bpath4 }));
		svgel.appendChild(border4);
	},
	
	fx.extend("TimelineSong_voteProgress", function(object, duration) {
		var tsvp = {};
		tsvp.duration = duration;
		
		tsvp.update = function() {
			object.setAttribute("d", "M" + (theme.Timeline_leftsidesize + 1) + ",0 H" + tsvp.now + " L" + (tsvp.now + theme.TimelineSong_rowheight) + "," + (theme.TimelineSong_rowheight) + " H" + (theme.Timeline_leftsidesize + 1) + " Z");
		};
		
		return tsvp;
	});
	
	/*****************************************************************************\
		NOW PLAYING PANEL
	*****************************************************************************/

	that.Extend.NowPanel = function(nowp) {
		nowp.draw = function() {
			nowp.svg.setAttribute("style", "position: absolute");
			
			nowp.defs = svg.makeEl("defs");
			
			var bkgmaskgrad = svg.makeGradient("linear", "NowPanel_bkgmaskgrad", "0%", "0%", "100%", "0%", "pad");
			bkgmaskgrad.appendChild(svg.makeStop("0%", "#FFFFFF", "1"));
			bkgmaskgrad.appendChild(svg.makeStop("95%", "#FFFFFF", "1"));
			bkgmaskgrad.appendChild(svg.makeStop("100%", "#000000", "1"));
			nowp.defs.appendChild(bkgmaskgrad);
			
			var bkgmask = svg.makeEl("mask", { id: "NowPanel_bkgmask" });
			bkgmask.appendChild(svg.makeRect(0, 0, nowp.width, nowp.height, { "fill": "url(#NowPanel_bkgmaskgrad)" }));
			nowp.defs.appendChild(bkgmask);
			
			nowp.el.appendChild(nowp.defs);
			
			var clip1 = svg.makeEl("clipPath", { id: "NowPanel_hdrclip" } );
			var anglestart = nowp.width - 125;
			var dropdown = svg.em * 4;
			clip1.appendChild(svg.makeEl("path", { d: "M" + theme.Timeline_leftsidesize + "," + svg.em + " H" + anglestart + " L" + (anglestart + svg.em) + ",0 H0 V" + (dropdown - theme.Timeline_leftsidesize) + " L" + theme.Timeline_leftsidesize + "," + dropdown + " Z" } ));
			nowp.el.appendChild(clip1);
			
			var clip2 = svg.makeEl("clipPath", { id: "NowPanel_bkgclip" } );
			clip2.appendChild(svg.makeEl("path", { d: "M" + (theme.Timeline_leftsidesize + 1) + "," + (svg.em + 1) + " H" + (anglestart + 1) + " L" + (anglestart + svg.em + 1) + ",0 H" + nowp.width + " V" + nowp.height + " H" + (theme.Timeline_leftsidesize + 1) + " Z" } ));
			nowp.el.appendChild(clip2);
			
			var bkggrad = svg.makeGradient("linear", "NowPanel_bkggrad", "0%", "0%", "0%", "100%", "pad");
			bkggrad.appendChild(svg.makeStop("0%", theme.brightbkg, "1"));
			bkggrad.appendChild(svg.makeStop("50%", theme.primarybkg, "1"));
			//bkggrad.appendChild(svg.makeStop("100%", theme.primarybkg, "0.7"));
			nowp.defs.appendChild(bkggrad);
			
			nowp.header = svg.makeEl("g", { clip_path: "url(#NowPanel_hdrclip)" } );
			nowp.bkg = svg.makeEl("g", { clip_path: "url(#NowPanel_bkgclip)" });
			if (nowp.width == (svg.em * 60)) nowp.bkg.setAttribute("mask", "url(#NowPanel_bkgmask)");
			
			var bkgrect = svg.makeRect(0, 0, "100%", "100%", { fill: "url(#NowPanel_bkggrad)" } );
			nowp.bkg.appendChild(bkgrect);
			
			nowp.hdrsolid = svg.makeRect(0, 0, nowp.width, dropdown, { fill: theme.primarybkg } );
			nowp.header.appendChild(nowp.hdrsolid);
			
			nowp.indicbkg = svg.makeRect(0, 0, theme.Timeline_leftsidesize, dropdown, { fill: "url(#TimelineSong_indnormal)" } );
			nowp.header.appendChild(nowp.indicbkg);
			
			//var indicbkg2 = svg.makeRect(0, 0, nowp.width, theme.Timeline_leftsidesize, { fill: "url(#TimelineSong_indnormalv)" });
			nowp.indicbkg2 = svg.makeRect(theme.Timeline_leftsidesize, 0, anglestart + svg.em, theme.Timeline_leftsidesize, { fill: theme.indicnormal });
			nowp.header.appendChild(nowp.indicbkg2);
			
			var np = svg.makeEl("text", { x: theme.Timeline_leftsidesize, y: svg.em * 0.8, style: "font-size: 0.8em", fill: theme.textcolor } );
			np.textContent = _l("nowplaying");
			nowp.header.appendChild(np);
			
			nowp.el.appendChild(nowp.header);
			nowp.el.appendChild(nowp.bkg);
		};
		
		nowp.changeHeader = function(json) {
			if (json.sched_type == SCHED_ELEC) {
				if (json.song_data[0].elec_isrequest == 1) {
					
					nowp.indicbkg.setAttribute("fill", "url(#TimelineSong_indrequest)");
					nowp.indicbkg2.setAttribute("fill", theme.indicrequest);
				}
				else if (json.song_data[0].elec_isrequest == -1) {
					nowp.indicbkg.setAttribute("fill", "url(#TimelineSong_inddconflict)");
					nowp.indicbkg2.setAttribute("fill", theme.indicconflict);
				}
				else {
					nowp.indicbkg.setAttribute("fill", "url(#TimelineSong_indnormal)");
					nowp.indicbkg2.setAttribute("fill", theme.indicnormal);
				}
			}
			else {
				nowp.indicbkg.setAttribute("fill", "url(#TimelineSong_indnormal)");
				nowp.indicbkg2.setAttribute("fill", theme.indicnormal);
			}
		};
	};
	
	that.NPDrawSong = function(song, npe, nowp) {
		var anglestart = nowp.width - 125;
		var leftartmargin = 15;
		npe.songdg = svg.makeEl("g");
		if (song.album_id) {
			npe.albumart = svg.makeImage("albumart/" + song.album_id + "-120.jpg", that.Timeline_leftsidesize + 5, 15, 120, 120);
			npe.albumart.setAttribute("preserveAspectRatio", "xMidYMin meet");
			npe.el.appendChild(npe.albumart);
			leftartmargin = 145;
		}
		npe.songdg.setAttribute("transform", "translate(" + leftartmargin + ", 6)");
		
		var rowpadding = Math.floor(svg.em * 2.2);
		var leftpadding = 0;
		var indent1 = leftpadding + 16;
		var indent2 = indent1 + 10;
		var roomfortext = nowp.width - leftartmargin - theme.Rating_width;
		var ratingx = nowp.width - leftartmargin - theme.Rating_width;
		if (nowp.width == (svg.em * 60)) {
			roomfortext -= 25;
			ratingx -= 25;
		}
		
		var songy = svg.em;
		var songstyle = "font-size: 1.1em; font-weight: bold;";
		if (song.ad_title) song.song_title = song.ad_title;
		if (song.song_title) {
			// nowp.song is defined (and filled with song data) by Edi.  nowp.songel is not required, but it's recommended you use it. :)
			npe.songel = svg.makeEl("text", { x: leftpadding, y: songy + (svg.em * 1.1), fill: theme.textcolor, style: songstyle } );
			npe.songel.textContent = fitText(song.song_title, roomfortext - leftpadding, songstyle);
			if (song.song_id) Song.linkify(song.song_id, npe.songel);
			npe.songdg.appendChild(npe.songel);
		}
		
		if (typeof(song.song_rating_user) != "undefined") {
			// nowp.songrating required by Edi
			npe.songrating = Rating({ category: "song", id: song.song_id, userrating: song.song_rating_user, albumrating: song.song_rating_avg, x: ratingx, y: songy - 2, favourite: song.song_favourite, register: true });
			npe.songdg.appendChild(npe.songrating.el);
		}

		var albumy = Math.floor(songy + rowpadding);
		var albumstyle = "font-size: 1.1em";
		if (song.ad_album) song.album_name = song.ad_album;
		if (song.album_name) {
			npe.albumel = svg.makeEl("text", { x: indent1, y: albumy + (svg.em * 1.1), fill: theme.textcolor, style: albumstyle } );
			npe.albumel.textContent = fitText(song.album_name, roomfortext - indent1, albumstyle);
			Album.linkify(song.album_id, npe.albumel);
			npe.songdg.appendChild(npe.albumel);
		}
		
		// nowp.albumrating required by Edi
		if (typeof(song.album_rating_user) != "undefined") {
			npe.albumrating = Rating({ category: "album", id: song.album_id, userrating: song.album_rating_user, siterating: song.album_rating_avg, x: ratingx, y: albumy - 2, favourite: song.album_favourite, register: true });
			npe.songdg.appendChild(npe.albumrating.el);
		}
		
		// note how we're using tspans for each artist's element, this allows properly display of the text in 1 line while
		// retaining the ability to have each artist have its own link
		var artisty = albumy + rowpadding;
		if (song.artists) {
			var artisttext = svg.makeEl("text", { x: indent1, y: artisty + svg.em, fill: theme.textcolor } );
			// nowp.artists is defined and filled by Edi, as is artistsToTSpans (also handles artist clickability!)
			artistsToTSpans(artisttext, song.artists);
			npe.artistel = artisttext;
			fitTSpans(npe.artistel, (nowp.width - 120) - indent1, false);
			npe.songdg.appendChild(npe.artistel);
		}
		else if (song.ad_artist) {
			npe.artistel = svg.makeEl("text", { x: indent1, y: artisty + (svg.em * 1.1), fill: theme.textcolor } );
			npe.artistel.textContent = fitText(song.ad_artist, roomfortext - indent1);
		}
		
		var linky = artisty + rowpadding;
		var urlused = false;
		if (song.ad_url && song.ad_url_text) {
			song.song_url = song.ad_url;
			song.song_url_text = song.ad_url_text;
		}
		if (song.song_url && (song.song_url.length > 0)) {
			urlused = true;
			npe.linkel = svg.makeEl("text", { x: indent1, y: linky + svg.em, fill: theme.textcolor } );
			npe.linkel.style.cursor = "pointer";
			npe.linkel.addEventListener('click', function(e) {
					var popupWin = window.open(song.song_url, song.song_url_text);
				}, true);
			npe.songdg.appendChild(npe.linkel);
		}
		
		var toptextleft = anglestart - leftartmargin;
		var toptexttop = svg.em - 2 - 6;
		if (song.elec_isrequest && ((song.elec_isrequest == 1) || (song.elec_isrequest == -1))) {
			var requestor = song.song_requestor;
			var reqtxt = "";
			if (song.elec_isrequest == 1) reqtxt = _l("requestedby");
			else if (song.elec_isrequest < 0) reqtxt = _l("conflictedwith");
			reqtxt = reqtxt + " " + song.song_requestor;
			console.log({ "nowp": nowp.width, "anglestart": anglestart });
			var reqby = svg.makeEl("text", { x: toptextleft, "text-anchor": "end", y: toptexttop, fill: theme.textcolor, style: "font-size: smaller;" } );
			reqby.textContent = reqtxt;
			npe.songdg.appendChild(reqby);
		}
		else if ((npe.p.username) && (npe.p.sched_type != SCHED_LIVE)) {
			var reqby = svg.makeEl("text", { x: toptextleft, "text-anchor": "end", y: toptexttop, fill: theme.textcolor, style: "font-size: smaller;" } );
			reqby.textContent = _l("from") + " " + npe.p.username;
			npe.songdg.appendChild(reqby);
		}
		else if (npe.p.sched_dj) {
			var reqby = svg.makeEl("text", { x: toptextleft, "text-anchor": "end", y: toptexttop, fill: theme.textcolor, style: "font-size: smaller;" } );
			reqby.textContent = _l("currentdj") + " " + npe.p.sched_dj;
			npe.songdg.appendChild(reqby);
		}

		var numvotes = song.elec_votes ? song.elec_votes : 0;
		if (numvotes > 0) {
			var votex = (nowp.width - 120 - theme.Rating_width - 13);
			npe.votes = svg.makeEl("text", { x: votex, y: linky + svg.em, "text-anchor": "end", fill: theme.textcolor } );
			npe.votes.textContent = numvotes;
			npe.songdg.appendChild(npe.votes);
			//var votelegendx = urlused ?  votex + (svg.em / 2) : indent1;
			var votelegendx = votex + (svg.em / 2);
			var votelegend = svg.makeEl("text", { x: votelegendx, y: linky + svg.em, fill: theme.textcolor } );
			if (numvotes == 1) votelegend.textContent = _l("vote");
			else votelegend.textContent = _l("votes");
			//if (!urlused) votelegend.textContent += ":";
			npe.songdg.appendChild(votelegend);
		}
		
		npe.el.appendChild(npe.songdg);
	};
	
	that.Extend.NPElection = function(npe, nowp) {
		npe.draw = function() {
			that.NPDrawSong(npe.p.song_data[0], npe, nowp);
			
			npe.fxY = fx.make(fx.SVGTranslateY, [ npe.el, 400, 0 ] );
			npe.fxY.set(50);
			npe.fxOpacity = fx.make(fx.SVGAttrib, [ npe.el, 400, "opacity", "" ] );
			npe.fxOpacity.set(0);
		};

		npe.destruct = function() {
			npe.songrating.destruct();
			npe.albumrating.destruct();
		};
		
		npe.animateIn = function() {
			npe.fxY.start(0);
			npe.fxOpacity.start(1);
		};
		
		npe.animateOut = function() {
			npe.fxY.start(50);
			npe.fxOpacity.start(0);
		};
	};
	
	that.Extend.NPJingle = function(npj, nowp) {
		npj.draw = function() {
			var anglestart = nowp.width - 125;
			
			var rowpadding = Math.floor(svg.em * 2.2);
			var leftpadding = theme.Timeline_leftsidesize + 9;
			var indent1 = leftpadding + 16;
			var indent2 = indent1 + 10;
			var roomfortext = nowp.width - 120 - theme.Rating_width;
			var ratingx = nowp.width - 117 - theme.Rating_width;
			
			var songy = theme.Timeline_leftsidesize + svg.em - 3;
			var songstyle = "font-size: 1.1em; font-weight: bold;";
			// nowp.song is defined (and filled with song data) by Edi.  nowp.songel is not required, but it's recommended you use it. :)
			npj.songel = svg.makeEl("text", { x: leftpadding, y: songy + (svg.em * 1.1), fill: theme.textcolor, style: songstyle } );
			npj.songel.textContent = fitText(_l("jingle"), roomfortext - leftpadding, songstyle);
			npj.el.appendChild(npj.songel);
			
			npj.fxY = fx.make(fx.SVGTranslateY, [ npj.el, 400, 0 ] );
			npj.fxY.set(50);
			npj.fxOpacity = fx.make(fx.SVGAttrib, [ npj.el, 400, "opacity", "" ] );
			npj.fxOpacity.set(0);
		};

		npj.destruct = function() {};
		
		npj.animateIn = function() {
			npj.fxY.start(0);
			npj.fxOpacity.start(1);
		};
		
		npj.animateOut = function() {
			npj.fxY.start(50);
			npj.fxOpacity.start(0);
		};
	};
	
	that.Extend.NPLiveShow = function(npl, nowp) {
		npl.draw = function() {
			var anglestart = nowp.width - 125;
			
			var rowpadding = Math.floor(svg.em * 2.2);
			var leftpadding = theme.Timeline_leftsidesize + 9;
			var indent1 = leftpadding + 16;
			var indent2 = indent1 + 10;
			var roomfortext = nowp.width - 120 - theme.Rating_width;
			var ratingx = nowp.width - 117 - theme.Rating_width;
			
			var songy = theme.Timeline_leftsidesize + svg.em - 3;
			var songstyle = "font-size: 1.1em; font-weight: bold;";
			// nowp.song is defined (and filled with song data) by Edi.  nowp.songel is not required, but it's recommended you use it. :)
			npl.songel = svg.makeEl("text", { x: leftpadding, y: songy + (svg.em * 1.1), fill: theme.textcolor, style: songstyle } );
			npl.songel.textContent = fitText(npl.p.sched_name, roomfortext - leftpadding, songstyle);
			npl.el.appendChild(npl.songel);
			
			npl.fxY = fx.make(fx.SVGTranslateY, [ npl.el, 400, 0 ] );
			npl.fxY.set(50);
			npl.fxOpacity = fx.make(fx.SVGAttrib, [ npl.el, 400, "opacity", "" ] );
			npl.fxOpacity.set(0);
		};

		npl.destruct = function() {};
		
		npl.animateIn = function() {
			npl.fxY.start(0);
			npl.fxOpacity.start(1);
		};
		
		npl.animateOut = function() {
			npl.fxY.start(50);
			npl.fxOpacity.start(0);
		};
	};
	
	that.Extend.NPPlaylist = function(npe, nowp) {
		npe.draw = function() {
			that.NPDrawSong(npe.p.song_data[npe.p.playlist_position], npe, nowp);
			
			npe.fxY = fx.make(fx.SVGTranslateY, [ npe.el, 400, 0 ] );
			npe.fxY.set(50);
			npe.fxOpacity = fx.make(fx.SVGAttrib, [ npe.el, 400, "opacity", "" ] );
			npe.fxOpacity.set(0);
		};

		npe.destruct = function() {
			npe.songrating.destruct();
			npe.albumrating.destruct();
		};
		
		npe.animateIn = function() {
			npe.fxY.start(0);
			npe.fxOpacity.start(1);
		};
		
		npe.animateOut = function() {
			npe.fxY.start(50);
			npe.fxOpacity.start(0);
		};
	};
	
	that.Extend.NPOneShot = that.Extend.NPElection;
	
	that.Extend.NPAdSet = function(npe, nowp) {
		npe.draw = function() {
			that.NPDrawSong(npe.p.ad_data[npe.p.adset_position], npe, nowp);
			
			npe.fxY = fx.make(fx.SVGTranslateY, [ npe.el, 400, 0 ] );
			npe.fxY.set(50);
			npe.fxOpacity = fx.make(fx.SVGAttrib, [ npe.el, 400, "opacity", "" ] );
			npe.fxOpacity.set(0);
		};

		npe.destruct = function() {
		};
		
		npe.animateIn = function() {
			npe.fxY.start(0);
			npe.fxOpacity.start(1);
		};
		
		npe.animateOut = function() {
			npe.fxY.start(50);
			npe.fxOpacity.start(0);
		};
	};

	/*****************************************************************************
	   Menu Panel Styling
	*****************************************************************************/
	
	that.menuDefs = function(svgel, defs) {
		var logohighlight = svg.makeGradient("linear", "menupanel_logohighlight", "0%", "0%", "0%", "100%", "pad");
		logohighlight.appendChild(svg.makeStop("0%", theme.indicnormal, 0));
		logohighlight.appendChild(svg.makeStop("100%", theme.indicnormal, 1));
		defs.appendChild(logohighlight);
		
		var logomask = svg.makeEl("mask", { id: "menupanel_rwmask" });
		var logoimage = svg.makeImage("images/stationselect-1.png", 0, 0, logowidth, logoheight);
		logomask.appendChild(logoimage);
		defs.appendChild(logomask);
		
		// logomask = svg.makeEl("mask", { id: "menupanel_ocmask" });
		// logoimage = svg.makeImage("images/stationselect-2.png", 0, 0, logowidth, logoheight);
		// logomask.appendChild(logoimage);
		// defs.appendChild(logomask);
		
		// logomask = svg.makeEl("mask", { id: "menupanel_vwmask" });
		// logoimage = svg.makeImage("images/stationselect-3.png", 0, 0, logowidth, logoheight);
		// logomask.appendChild(logoimage);
		// defs.appendChild(logomask);
		
		var logoclip = svg.makeEl("clipPath", { id: "menupanel_logoclip" });
		logoclip.appendChild(svg.makeEl("path", { d: "M0,0 V50 H250 V0 Z" } ));
		defs.appendChild(logoclip);
		
		var logoswipegrad = svg.makeGradient("linear", "menupanel_logoswipe", "0%", "0%", "100%", "0%", "pad");
		logoswipegrad.appendChild(svg.makeStop("0%", "white", "0"));
		logoswipegrad.appendChild(svg.makeStop("70%", "white", "1"));
		logoswipegrad.appendChild(svg.makeStop("95%", "white", "1"));
		logoswipegrad.appendChild(svg.makeStop("100%", "white", "0"));
		defs.appendChild(logoswipegrad);
		
		var rwlogograd = svg.makeGradient("linear", "menupanel_Rainwavegrad", "0%", "0%", "0%", "100%", "pad");
		rwlogograd.appendChild(svg.makeStop("0%", "#f36f3d", "1"));
		rwlogograd.appendChild(svg.makeStop("100%", "#faca19", "1"));
		defs.appendChild(rwlogograd);
	};

	that.createLogoSwipe = function(attachel, maskname, bkgname) {
		var logo = svg.make({ "width": logowidth, "height": logoheight });
		var logog = svg.makeEl("g", { "mask": "url(#" + maskname + ")", "clip_path": "url(#menupanel_logoclip)" } );
		logog.appendChild(svg.makeRect(0, 0, logowidth, logoheight, { fill: "url(#" + bkgname + ")" } ));
		var logoswipe = svg.makeRect(0, 0, Math.round(logowidth * .75), logoheight, { fill: "url(#menupanel_logoswipe)" } );
		logog.appendChild(logoswipe);
		logo.appendChild(logog);
		var fx_logoswipe = fx.make(fx.SVGAttrib, [ logoswipe, 1500, "x", "" ], { "unstoppable": true });
		fx_logoswipe.set(logowidth);
		attachel.addEventListener("mouseover", function() { fx_logoswipe.start(-Math.round(logowidth * .75), logowidth); }, true);
		attachel.style.cursor = "pointer";
		attachel.appendChild(logo);
	};

	that.Extend.MenuPanel = function(menup) {	
		menup.draw = function() {
			menup.loginbox = createEl("table", { "class": "loginbox", "cellborder": 0, "cellpadding": 0 });
			var row = createEl("tr");
			row.appendChild(createEl("td", { "textContent": _l("username"), "style": "padding-right: 1em;" }));
			var td = createEl("td");
			menup.login_username = createEl("input", { "type": "text" });
			menup.login_username.addEventListener('keypress', menup.loginBoxKeypress, true);
			td.appendChild(menup.login_username);
			var closelogin = createEl("span", { "textContent": "X" });
			closelogin.addEventListener("click", menup.hideLoginBox, true);
			closelogin.style.marginLeft = "1em";
			closelogin.style.cursor = "pointer";
			td.appendChild(closelogin);
			row.appendChild(td);
			menup.loginbox.appendChild(row);
			row = createEl("tr");
			row.appendChild(createEl("td", { "textContent": _l("password") }));
			td = createEl("td");
			menup.login_password = createEl("input", { "type": "password" });
			menup.login_password.addEventListener('keypress', menup.loginBoxKeypress, true);
			td.appendChild(menup.login_password);
			row.appendChild(td);
			menup.loginbox.appendChild(row);
			row = createEl("tr");
			row.appendChild(createEl("td", { "textContent": _l("autologin") }));
			td = createEl("td");
			menup.login_auto = createEl("input", { "type": "checkbox", "checked": "yes" });
			td.appendChild(menup.login_auto);
			row.appendChild(td);
			menup.loginbox.appendChild(row);
			row = createEl("tr");
			row.appendChild(createEl("td", { "textContent": "" }));
			td = createEl("td");
			menup.login_button = createEl("button", { "textContent": _l("login") });
			menup.login_button.addEventListener('click', menup.loginSubmit, true);
			td.appendChild(menup.login_button);
			row.appendChild(td);
			menup.loginbox.appendChild(row);
			menup.loginbox.style.position = "absolute";
			menup.loginbox.style.marginTop = (menup.el.offsetHeight + 3) + "px";
			menup.loginbox.style.zIndex = "100";
			
			menup.table = createEl("table", { "class": "menu_table", "cellspacing": 0 });
			var row = createEl("tr");
			menup.td_station = createEl("td", { "class": "menu_td_station" });
			
			var stationlogo = createEl("img", { "src": "images/rainwave-menu-logo.png" });
			menup.td_station.appendChild(stationlogo);
			
			menup.ul_select = createEl("ul", { "class": "menu_select" } );
			var li = createEl("li");
			that.createLogoSwipe(li, "menupanel_rwmask", "menupanel_Rainwavegrad");
			li.addEventListener("click", function() { menup.changeStation(1); }, true);
			menup.ul_select.appendChild(li);
			row.appendChild(menup.td_station);
			fx.makeMenuDropdown(menup.el, stationlogo, menup.ul_select);
			
			menup.td_play = createEl("td", { "class": "menu_td_play" });
			
			menup.player = createEl("span", { "class": "menu_player" });
			menup.player.addEventListener("click", menup.playerClick, true);
			menup.player.style.cursor = "pointer";
			menup.fx_player = fx.make(fx.CSSNumeric, [ menup.player, 250, "opacity", 0 ]);
			menup.fx_player.set(1);
			menup.player.innerHTML = _l("play");
			menup.td_play.appendChild(menup.player);
			
			row.appendChild(menup.td_play);
			
			menup.td_download = createEl("td", { "class": "menu_td_download" });
			
			var vlc = createEl("img", { "src": "images/vlc.png", "class": "link" });
			var fx_vlc = fx.make(fx.CSSNumeric, [ vlc, 250, "opacity", "" ]);
			fx_vlc.set(0.85);
			vlc.addEventListener("click", menup.tuneInClick, true);
			vlc.addEventListener("mouseover", function() { fx_vlc.start(1) }, true);
			vlc.addEventListener("mouseout", function() { fx_vlc.start(0.85) }, true);
			menup.td_download.appendChild(vlc);
			
			var winamp = createEl("img", { "src": "images/winamp.png", "class": "link" });
			var fx_winamp = fx.make(fx.CSSNumeric, [ winamp, 250, "opacity", "" ]);
			fx_winamp.set(.85);
			winamp.addEventListener("mouseover", function() { fx_winamp.start(1) }, true);
			winamp.addEventListener("mouseout", function() { fx_winamp.start(0.85) }, true);
			winamp.addEventListener("click", menup.tuneInClick, true);
			menup.td_download.appendChild(winamp);
			
			var fb2k = createEl("img", { "src": "images/fb2k.png", "class": "link" });
			var fx_fb2k = fx.make(fx.CSSNumeric, [ fb2k, 250, "opacity", "" ]);
			fx_fb2k.set(0.85);
			fb2k.addEventListener("mouseover", function() { fx_fb2k.start(1) }, true);
			fb2k.addEventListener("mouseout", function() { fx_fb2k.start(0.85) }, true);
			fb2k.addEventListener("click", menup.tuneInClick, true);
			menup.td_download.appendChild(fb2k);
			
			row.appendChild(menup.td_download);
			
			help.changeStepPointEl("tunein", [ menup.player, menup.td_download ]);
			help.changeTopicPointEl("tunein", [ menup.player, menup.td_download ]);
			
			menup.td_news = createEl("td", { "class": "menu_td_news" });
			row.appendChild(menup.td_news);
			
			menup.td_user = createEl("td", { "class": "menu_td_user" });
			menup.avatar = createEl("img", { "class": "menu_avatar", "src": "images/blank_avatar.png" });
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
			chatlink.innerHTML = _l("chat") + "<img src='images/new_window_icon.png' alt='' style='height: 12px;' />";
			menup.td_chat.appendChild(chatlink);
			row.appendChild(menup.td_chat);
			
			menup.td_forums = createEl("td", { "class": "menu_td_forums" });
			var forumlink = createEl("a", { "target": "_blank", "href": "/forums" });
			forumlink.innerHTML = _l("forums") + "<img src='images/wikilink_12px.png' alt='' style='height: 12px;' />";
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
			coglinks.style.left = help.getElPosition(menup.td_cog).x + "px";
			
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
			if (code == 13) { menup.loginSubmit(); }				
			hotkey.stopBubbling(evt);
		};
		
		menup.loginSubmit = function() {
			menup.doLogin(menup.login_username.value, menup.login_password.value, menup.login_auto.checked);
		};
		
		menup.changeAvatar = function(avatar) {
			menup.avatar.setAttribute("src", avatar);
		};
		
		menup.drawTuneInChange = function(tunedin) {
			if (Oggpixel && Oggpixel.playing) {
				menup.player.style.backgroundColor = "#225f8a";
				menup.player.style.cursor = "pointer";
				menup.fx_player.start(1);
				if (tunedin == 1) menup.player.innerHTML = _l("playing");
				else menup.player.innerHTML = _l("waitingforstatus");
			}
			else if (Oggpixel && (tunedin == -1)) {
				menup.player.innerHTML = _l("loading");
			}
			else if (tunedin == 1) {
				menup.player.style.backgroundColor = "transparent";
				menup.player.style.cursor = "none";
				menup.fx_player.start(.65);
				menup.player.innerHTML = _l("tunedin");
			}
			else {
				menup.player.style.backgroundColor = "#225f8a";
				menup.player.style.cursor = "pointer";
				menup.fx_player.start(1);
				menup.player.innerHTML = _l("play");
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
		
		/*menup.showCompatPlayers = function() {
			if (compatplayerstimer) clearTimeout(compatplayerstimer);
			menup.userinfogroup.appendChild(menup.compatplayersg);
		};
		
		menup.hideCompatPlayers = function() {
			if (compatplayerstimer) clearTimeout(compatplayerstimer);
			compatplayerstimer = setTimeout(menup.hideCompatPlayers2, 1000);
		};
		
		menup.hideCompatPlayers2 = function() {
			menup.userinfogroup.removeChild(menup.compatplayersg);
		};*/
		
		/*menup.showUsername = function(username) {
			menup.username.textContent = username;
			var pnode;
			if (menup.logintext.parentNode) pnode = menup.logintext.parentNode;
			else if (menup.username.parentNode) pnode = menup.username.parentNode;
			if (username && menup.logintext.parentNode) pnode.removeChild(menup.logintext);
			else if (!username && !menup.logintext.parentNode) pnode.appendChild(menup.logintext);
			if (!username && menup.username.parentNode) pnode.removeChild(menup.username);
			else if (username && !menup.username.parentNode) pnode.appendChild(menup.username);
		};*/

		/*menup.helpOver = function(e) {
			//menup.help.setAttribute("fill", theme.brightbkg);
			//menup.help.setAttribute("stroke", theme.linkcolor);
			menup.helptext.setAttribute("fill", theme.linkcolor);
			//menup.helpicon.setAttribute("fill", theme.linkcolor);
		};

		menup.helpOut = function(e) {
			//menup.help.setAttribute("fill", theme.primarybkg);
			//menup.help.setAttribute("stroke", theme.textcolor);
			menup.helptext.setAttribute("fill", theme.textcolor);
			//menup.helpicon.setAttribute("fill", theme.textcolor);
		};

		menup.forumOver = function(e) {
			menup.forumstext.setAttribute("fill", theme.linkcolor);
		};

		menup.forumOut = function(e) {
			menup.forumstext.setAttribute("fill", theme.textcolor);
		};

		menup.optionOver = function(e) {
			menup.options.setAttribute("fill", theme.brightbkg);
			menup.options.setAttribute("stroke", theme.linkcolor);
			menup.optionstext.setAttribute("fill", theme.linkcolor);
			menup.optionicon1.setAttribute("stroke", theme.linkcolor);
			menup.optionicon2.setAttribute("fill", theme.linkcolor);
			menup.optionicon3.setAttribute("stroke", theme.linkcolor);
			menup.optionicon4.setAttribute("fill", theme.linkcolor);
		};

		menup.optionOut = function(e) {
			menup.options.setAttribute("fill", theme.primarybkg);
			menup.options.setAttribute("stroke", theme.textcolor);
			menup.optionstext.setAttribute("fill", theme.textcolor);
			menup.optionicon1.setAttribute("stroke", theme.textcolor);
			menup.optionicon2.setAttribute("fill", theme.textcolor);
			menup.optionicon3.setAttribute("stroke", theme.textcolor);
			menup.optionicon4.setAttribute("fill", theme.textcolor);
		};

		menup.tuneInOver = function(e) {
			menup.tunedin.setAttribute("fill", theme.linkcolor);
		};

		menup.tuneInOut = function(e) {
			menup.tunedin.setAttribute("fill", theme.textcolor);
		};

		menup.updateTuneInCatch = function(tunedin) {
			menup.tuneincatch.setAttribute("width", measureText(menup.tunedin.textContent));
		};

		menup.stationSelectOver = function(e) {
			menup.FxSelectOn.start(1);
			menup.FxLogoSwipe.start(-150, 275);
		};

		menup.stationSelectOut = function(e) {
			menup.FxSelectOn.start(0);
		};*/

		/*menup.changeAvatar = function(avatar) {
			menup.userinfogroup.removeChild(menup.avatar);
			menup.avatar = svg.makeImage(avatar, 0, 0, 32, 32);
			menup.userinfogroup.appendChild(menup.avatar);
		};*/
		
		return menup;
	};
		
	/*****************************************************************************
	   MPI Styling
	*****************************************************************************/

	that.Extend.MainMPI = function(mpi) {
		mpi.draw = function() {
			mpi.bkg = document.createElement("div");
			mpi.divPositionAndSize(mpi.bkg);
			mpi.bkg.style.zIndex = "1";
			mpi.bkg.style.top = mpi.panelsroom + "px";
			mpi.container.appendChild(mpi.bkg);
		};
		
		return mpi;
	};
	
	fx.extend("TabSize", function(object, duration) {
		var tsfx = {};
		tsfx.duration = duration;
		tsfx.update = function() {
			object.setAttribute("d", "M" + (tsfx.now + 8) + ",0 H0 V" + that.MPI_MenuHeight + " H" + (tsfx.now + that.MPI_MenuHeight + 8) + " Z");
		};
			
		return tsfx;
	});
	

	that.TabBar = function(container, width) {
		var tabs = {};
		tabs.container = container;
		tabs.width = width;
		tabs.svgmenu = svg.make( { width: tabs.width, height: that.MPI_MenuHeight + 2 } );
		tabs.hr = svg.makeRect(0, that.MPI_MenuHeight, tabs.width, 2, { fill: that.indicnormal } );
		//tabs.hr = svg.makeRect(tabs.width, that.MPI_MenuHeight, 0, 2, { fill: that.indicnormal } );
		//tabs.fx_hrx = fx.make(fx.SVGAttrib, [ tabs.hr, 250, "x", "" ]);
		//tabs.fx_hrx.set(tabs.width);
		//tabs.fx_hrwidth = fx.make(fx.SVGAttrib, [ tabs.hr, 250, "width", "" ]);
		tabs.svgmenu.appendChild(tabs.hr);
		tabs.container.appendChild(tabs.svgmenu);
		tabs.panels = {};

		tabs.addItem = function(panelname, title) {
			/*var newx = 0;
			var mcount = 0;
			var firstel = false;
			for (var m in tabs.panels) {
				if (typeof(tabs.panels[m].textwidth) != "undefined") {
					firstel = tabs.panels[m].group;
					newx += tabs.panels[m].textwidth + (that.MPI_MenuHeight);
					mcount++;
				}
			}*/
			var rightpad = 8;
			var textpad = 5;
			/*if (newx > 0) {
				newx -= 13;
				rightpad = 22;
				textpad = 22;
			}*/
			
			tabs.panels[panelname] = {};
			tabs.panels[panelname].group = svg.makeEl("g", { shape_rendering: "crispEdges", opacity: 0.7 } );
			tabs.panels[panelname].fx_groupx = fx.make(fx.SVGTranslateX, [ tabs.panels[panelname].group, 350, 0 ] );
			tabs.panels[panelname].textwidth = measureText(title);
			tabs.panels[panelname].outline = svg.makeEl("path", { stroke_width : 1, stroke: that.indicnormal, fill: "black" } );
			tabs.panels[panelname].fx_resize = fx.make(fx.TabSize, [ tabs.panels[panelname].outline, 250 ]);
			tabs.panels[panelname].fx_resize.set(tabs.panels[panelname].textwidth);
			tabs.panels[panelname].group.appendChild(tabs.panels[panelname].outline);
			tabs.panels[panelname].el = svg.makeEl("text", { x: textpad, y: svg.em + 4, fill: that.textcolor } );
			tabs.panels[panelname].el.textContent = title;
			tabs.panels[panelname].group.appendChild(tabs.panels[panelname].el);
			tabs.panels[panelname].group.panelname = panelname;
			tabs.panels[panelname].group.style.cursor = "pointer";
			tabs.panels[panelname].group.addEventListener("mouseover", tabs.mouseOverTab, true);
			tabs.panels[panelname].group.addEventListener("mouseout", tabs.mouseOutTab, true);
			tabs.panels[panelname].focused = false;
			tabs.panels[panelname].enabled = false;
			tabs.svgmenu.appendChild(tabs.panels[panelname].group);
			//else tabs.svgmenu.insertBefore(tabs.panels[panelname].group, firstel);
			tabs.positionTabs(false);
		};
		
		tabs.positionTabs = function(animate) {
			//var disabled = [];
			//var enabled = [];
			var i;
			var runx = 0;
			for (i in tabs.panels) {
				tabs.panels[i].fx_groupx.start(runx);
				runx += tabs.panels[i].textwidth + 8 + that.MPI_MenuHeight;
				//if (tabs.panels[i].enabled) enabled.push(i);
				//else disabled.push(i);
			}
			/*var runx = 0;
			for (i = 0; i < enabled.length; i++) {
				if (animate) tabs.panels[enabled[i]].fx_groupx.start(runx);
				else tabs.panels[enabled[i]].fx_groupx.set(runx);
				runx += tabs.panels[enabled[i]].textwidth + 8 + that.MPI_MenuHeight;
			}*/
			/*runx = tabs.width;
			for (i = disabled.length - 1; i >= 0; i--) {
				runx -= tabs.panels[disabled[i]].textwidth + 8 + that.MPI_MenuHeight;
				if (animate) tabs.panels[disabled[i]].fx_groupx.start(runx);
				else tabs.panels[disabled[i]].fx_groupx.set(runx);
			}*/
			/*if (enabled.length == 0) {
				if (animate) {
					tabs.fx_hrx.start(runx);
					tabs.fx_hrwidth.start(tabs.width - runx);
				}
				else {
					tabs.fx_hrx.set(runx);
					tabs.fx_hrwidth.set(tabs.width - runx);
				}
				tabs.hr.setAttribute("opacity", 0.5);
			}
			else {
				if (animate) {
					tabs.fx_hrx.start(0)
					tabs.fx_hrwidth.start(tabs.width);
				}
				else {
					tabs.fx_hrx.set(0)
					tabs.fx_hrwidth.set(tabs.width);
				}
				tabs.hr.setAttribute("opacity", 1.0);
			}*/
		};
		
		tabs.enableTab = function(panelname, animate) {
			tabs.panels[panelname].enabled = true;
			tabs.panels[panelname].group.setAttribute("opacity", 1.0);
			tabs.positionTabs(animate);
		};

		tabs.focusTab = function(panelname) {
			if (tabs.panels[panelname].focused == true) {
				tabs.panels[panelname].outline.setAttribute("fill", that.indicnormal);
			}
			else {
				tabs.panels[panelname].outline.setAttribute("fill", "black");
			}
		};

		tabs.mouseOverTab = function(evt) {
			tabs.panels[evt.currentTarget.panelname].outline.setAttribute("fill", that.indicnormalbright)
		};

		tabs.mouseOutTab = function(evt) {
			tabs.focusTab(evt.currentTarget.panelname);
		};
		
		tabs.changeTitle = function(panelname, newtitle) {
			tabs.panels[panelname].textwidth = measureText(newtitle);
			tabs.panels[panelname].fx_resize.start(tabs.panels[panelname].textwidth);
			tabs.panels[panelname].el.textContent = newtitle;
			tabs.positionTabs(true);
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
		var keynavscrolloffset = svg.em * 5;
		var odholder;
		
		pp.draw = function() {
			var leftwidth = svg.em * 30;
		
			el = document.createElement("table");
			pp.width = pp.container.offsetWidth;
			el.setAttribute("class", "pl_table");
			el.style.tableLayout = "fixed";
			el.style.height = pp.container.offsetHeight + "px";
			el.style.width = "100%";
			
			tr = document.createElement("tr");

			inlinesearchc = document.createElement("div");
			inlinesearchc.setAttribute("class", "pl_searchc");
			var tempspan = document.createElement("span");
			tempspan.textContent = "Search: ";
			inlinesearchc.appendChild(tempspan);
			inlinesearch = document.createElement("span");
			inlinesearch.textContent = "";
			inlinesearch.setAttribute("class", "pl_search");
			inlinesearchc.appendChild(inlinesearch);
			pp.container.appendChild(inlinesearchc);

			listtd = document.createElement("td");
			listtd.setAttribute("id", "pl_albumlist_td");
			listtd.setAttribute("class", "pl_listtd");
			listtd.style.width = leftwidth + "px";
			
			albumlistc = document.createElement("div");
			albumlistc.style.overflow = "scroll";
			albumlistc.style.height = pp.container.offsetHeight + "px";
			albumlist = document.createElement("table");
			albumlist.setAttribute("class", "pl_albumlist");
			albumlistc.appendChild(albumlist);
			listtd.appendChild(albumlistc);
			tr.appendChild(listtd);
			
			maintd = document.createElement("td");
			maintd.setAttribute("class", "pl_maintd");
			odholder = document.createElement("div");
			odholder.setAttribute("class", "pl_odholder");
			odholder.style.height = pp.container.offsetHeight + "px";
			maintd.appendChild(odholder);
			tr.appendChild(maintd);
			
			el.appendChild(tr);
			
			
			pp.container.appendChild(el);
		};
		
		pp.drawAlbumlistEntry = function(album) {
			album.tr = document.createElement("tr");
			album.tr.album_id = album.album_id;

			album.album_rating_user = album.album_rating_user;
			var ratingx = album.album_rating_user * 10;
			album.td_name = document.createElement("td");
			album.td_name.setAttribute("class", "pl_al_name");
			album.td_name.style.backgroundPosition = "100% " + (-200 + ratingx) + "px";
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
			albumlistc.style.height = (pp.container.offsetHeight - (svg.em * 2)) + "px";
			albumlistc.style.marginTop = (svg.em * 2) + "px";
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
			albumlist.insertBefore(album1.tr, album2.tr);
		};
		
		pp.appendChild = function(album) {
			albumlist.appendChild(album.tr);
		};
		
		pp.removeChild = function(album) {
			albumlist.removeChild(album.tr);
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
			album.td_name.style.backgroundPosition = "100% " + (-200 + ratingx) + "px";
			album.td_rating.textContent = album.album_rating_user.toFixed(1);
		};
		
		pp.favResultDraw = function(album, result) {
			album.td_fav.setAttribute("class", "pl_fav_" + result.favourite);
		};
		
		pp.updateKeyNavOffset = function(album) {
			pp.setKeyNavOffset(album.tr.offsetTop - albumlistc.scrollTop);
		};
		
		pp.setKeyNavOffset = function(offset) {
			if (offset && (offset > svg.em * 5)) {
				keynavscrolloffset = offset;
			}
			else {
				keynavscrolloffset = svg.em * 5;
			}
		}
		
		pp.scrollToAlbum = function(album) {
			if (album) {
				albumlistc.scrollTop = album.tr.offsetTop - keynavscrolloffset;
			}
		};
		
		pp.clearInlineSearchDraw = function() {
			inlinesearchc.style.display = "none";
			albumlistc.style.height = pp.container.offsetHeight + "px";
			albumlistc.style.marginTop = "0px";
		};
	
		pp.drawAlbum = function(div, json) {
			div.hdrtable = document.createElement("table");
			div.hdrtable.style.width = "100%";
			div.hdrtable.setAttribute("cellspacing", "0");
			
			var tr = document.createElement("tr");
			div.albumnametd = document.createElement("td");
			div.albumnametd.setAttribute("class", "pl_ad_albumnametd");
			div.albumnametd.setAttribute("colspan", 2);
			
			div.albumname = document.createElement("div");
			div.albumname.setAttribute("class", "pl_ad_albumname");
			div.albumname.textContent = json.album_name;
			div.albumnametd.appendChild(div.albumname);
			
			div.albumratingsvg = svg.make({ "class": "pl_ad_albumrating", "width": that.Rating_width * 1.5, "height": svg.em * 2 });
			div.albumrating = Rating({ category: "album", id: json.album_id, userrating: json.album_rating_user, siterating: json.album_rating_avg, favourite: json.album_favourite, scale: 1.2, register: true });
			div.albumratingsvg.appendChild(div.albumrating.el);
			div.albumnametd.appendChild(div.albumratingsvg);
			
			tr.appendChild(div.albumnametd);
			div.hdrtable.appendChild(tr);
			tr = document.createElement("tr");
			
			div.albumdetailtd = document.createElement("td");
			div.albumdetailtd.setAttribute("class", "pl_ad_albumdetailtd");
			
			if (json.album_rating_count >= 2) {
				var gr = graph.makeSVG(graph.RatingHistogram, that.RatingHistogramMask, 200, 120 - (svg.em * 3), { maxx: 5, stepdeltax: 0.5, stepsy: 3, xprecision: 1, xnumbermod: 1, xnonumbers: true, minx: 0.5, miny: true, padx: 10, raw: json.album_rating_histogram });
				//var gr = graph.makeSVG(graph.RatingHistogram, that.RatingHistogramMask, 200, 120 - (svg.em * 3), { maxx: 5, stepdeltax: 0.5, stepsy: 3, xprecision: 1, xnumbermod: 1, xnonumbers: true, minx: 0.5, miny: true, padx: 10, raw: { "1.0": 53, "1.5": 84, "2.0": 150, "2.5": 200, "3.0": 250, "3.5": 300, "4.0": 350, "4.5": 400, "5.0": 521 }});
				gr.svg.setAttribute("class", "pl_ad_ratinghisto");
				div.albumdetailtd.appendChild(gr.svg);
			}
			
			var stats = document.createElement("div");
			var tmp = document.createElement("div");
			if (json.album_lowest_oa > clock.now) tmp.innerHTML = _l("pl_oncooldown")  + formatHumanTime(json.album_lowest_oa - clock.now, true, true) + _l("pl_oncooldown2");
			stats.appendChild(tmp);
			tmp = document.createElement("div");
			tmp.innerHTML = _l("pl_ranks") + _lSuffixNumber(json.album_rating_rank) + _l("pl_ranks2");
			stats.appendChild(tmp);
			if (json.album_fav_count > 0) {
				tmp = document.createElement("div");
				tmp.innerHTML = _l("pl_favourited") + json.album_fav_count + " " + _l("pl_favourited2") + _lPlural(json.album_fav_count, "person")  + _l("pl_favourited3");
				stats.appendChild(tmp);
			}
			if ((json.album_timeswon > 0) && (json.album_timesdefeated > 0)) {
				tmp = document.createElement("div");
				tmp.innerHTML = _l("pl_wins") + ((json.album_timeswon / (json.album_timeswon + json.album_timesdefeated)) * 100).toFixed(1) + _l("pl_wins2") + _lSuffixNumber(json.album_winloss_rank) + _l("pl_wins3");
				stats.appendChild(tmp);
			}
			if (json.album_totalrequests > 0) {
				tmp = document.createElement("div");
				tmp.innerHTML = _l("pl_requested") + json.album_totalrequests + _l("pl_requested2") + _lSuffixNumber(json.album_request_rank) + _l("pl_requested3");
				stats.appendChild(tmp);
			}
			if (json.album_genres.length == 1) {
				tmp = document.createElement("div");
				tmp.innerHTML = _l("pl_genre") + json.album_genres[0].genre_name + _l("pl_genre2");
				stats.appendChild(tmp);
			}
			else if (json.album_genres.length > 1) {
				tmp = document.createElement("div");
				tmp.innerHTML = _l("pl_genres");
				for (var g = 0; g < json.album_genres.length; g++) {
					if (g > 0) tmp.innerHTML += ", ";
					if (g == (json.album_genres.length - 1)) tmp.innerHTML += _l("and") + " ";
					tmp.innerHTML += json.album_genres[g].genre_name;
				}
				tmp.innerHTML += _l("pl_genres2");
				stats.appendChild(tmp);
			}
			div.albumdetailtd.appendChild(stats);
			
			tr.appendChild(div.albumdetailtd);
			
			div.albumarttd = document.createElement("td");
			div.albumarttd.setAttribute("class", "pl_ad_albumarttd");
			div.albumarttd.style.width = "135px";
			div.albumartsvg = svg.make({ width: 120, height: 120 });
			div.albumartsvg.setAttribute("class", "pl_ad_albumart");
			div.albumartsvg.appendChild(svg.makeRect(0, 0, 120, 120, { "fill": "#000000", "stroke-width": 1, "stroke": "#000000" }));
			div.albumart = svg.makeImage("albumart/" + json.album_id + "-120.jpg", 0, 0, 120, 120, { "stroke": "#333333", "stroke-width": 2, "preserveAspectRatio": "xMidYMid meet" });
			//div.albumart.setAttribute("preserveAspectRatio", "xMidYMid meet");
			//div.albumart.setAttribute("src", "albumart/" + json.album_id + "-240.jpg");
			div.albumartsvg.appendChild(div.albumart)
			div.albumarttd.appendChild(div.albumartsvg);
			
			tr.appendChild(div.albumarttd);
			div.hdrtable.appendChild(tr);
			div.appendChild(div.hdrtable);
			
			div.songlist = document.createElement("table");
			div.songlist.setAttribute("class", "pl_songlist");
			div.songlist.style.clear = "both";
			div.songarray = [];
			that.drawAlbumTable(div.songlist, div.songarray, json.song_data);
			
			div.updateHelp = function() {
				help.changeStepPointEl("clicktorequest", [ div.songarray[0].td_r ]);
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
				ns.svg_rating = svg.make({ "width": that.Rating_width, "height": svg.em * 1.4 });
				ns.rating = Rating({ category: "song", id: song_data[i].song_id, userrating: song_data[i].song_rating_user, x: 0, y: 1, siterating: song_data[i].song_rating_avg, favourite: song_data[i].song_favourite, register: true });
				ns.svg_rating.appendChild(ns.rating.el);
				ns.td_rating.appendChild(ns.svg_rating);
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
			
			if (!overridetext) obj.text.innerHTML = _l("log_" + code);
			else obj.text.innerHTML = overridetext;
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
	};
	
	// /*****************************************************************************
	// GRAPH MASKING FUNCTIONS
	// *****************************************************************************/
	
	that.RatingHistogramMask = function(graph, mask) {
		mask.appendChild(svg.makeRect(0, 0, graph.width, graph.height, { fill: "url(#Rating_usergradient)" }));
	};	
	
	// /*****************************************************************************
	// MISC THEME-SPECIFIC FUNCTIONS
	// All functions here are not required by Edi.
	// *****************************************************************************/
	
	// RWClassic.prototype.HFadeRightDefs = function(defel, fadestart, fadefull, size) {
		// if (typeof(fadestart) == "undefined") fadestart = 0;
		// if (typeof(fadefull) == "undefined") fadefull = 100;
		// var bordergrad = svg.makeGradient("linear", "fadeHRGrad" + fadestart + "_" + fadefull, "100%", "0%", "0%", "0%", "pad");
		// bordergrad.appendChild(svg.makeStop(fadestart + "%", "#FFFFFF", "1"));
		// bordergrad.appendChild(svg.makeStop(fadefull + "%", "#000000", "0"));
		// defel.appendChild(bordergrad);
		
		// var mask = svg.makeEl("mask");
		// mask.setAttribute("id", "fadeHROut" + fadestart + "_" + fadefull);
		// var rect = svg.makeRect(0, 0, size, "100%", { fill: "url(#fadeHRGrad" + fadestart + "_" + fadefull + ")" });
		// mask.appendChild(rect);
		// defel.appendChild(mask);
	// }
	
	return that;
};