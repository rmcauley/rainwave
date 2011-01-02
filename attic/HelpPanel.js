panels.HelpPanel = {
	ytype: "slack",
	height: svg.em * 30,
	minheight: svg.em * 20,
	xtype: "fit",
	width: svg.em * 25,
	minwidth: svg.em * 10,
	title: "Help",
	intitle: "HelpPanel",
	
	constructor: function(edi, container) {
		var that = {};
		var objs = {};
		var showing = {};
		that.container = container;
		
		that.init = function() {
			container.style.overflow = "scroll";
			
			container.appendChild(that.createHelpEl("h2", ((!prefs.p.help || !prefs.p.help.visited.value) ? "welcometorainwave" : "helptuneinvoting")));
			prefs.changePref("help", "visited", true);
			
			container.appendChild(that.createHelpEl("p", "rainwaveis"));
			
			objs.ol = document.createElement("ol");
			container.appendChild(objs.ol);
			
			objs.tunein = document.createElement("li");
			objs.tunein.appendChild(that.createHelpEl("span", "tunein", [ "builtinplayer", "downloadm3u" ]));
			/*objs.tunein.appendChild(that.createHelpEl("span", "builtinplayer", "builtinplayer"));
			objs.tunein.appendChild(createEl("span", { "textContent": ", " }));
			objs.tunein.appendChild(that.createHelpEl("span", "or"));
			objs.tunein.appendChild(createEl("span", { "textContent": " " }));
			objs.tunein.appendChild(that.createHelpEl("span", "downloadm3u", "downloadm3u"));
			objs.tunein.appendChild(that.createHelpEl("span", "requiresogg"));
			objs.tunein.appendChild(that.createHelpEl("span", "supportedplayers"));
			objs.tunein.appendChild(that.createHelpEl("span", "requiresogg2"));*/
			objs.ol.appendChild(objs.tunein);
			
			objs.tunestatus = document.createElement("li");
			/*objs.tunestatus.appendChild(that.createHelpEl("span", "onceyouare"));
			objs.tunestatus.appendChild(that.createHelpEl("span", "tunedin", "downloadm3u"));
			objs.tunestatus.appendChild(that.createHelpEl("span", "youcan"));*/
			objs.tunestatus.appendChild(that.createHelpEl("span", "voteforthesongyouwant", [ "vote1", "vote2", "vote3" ]));
			objs.ol.appendChild(objs.tunestatus);
			
			objs.mostvotes = document.createElement("li");
			objs.mostvotes.appendChild(that.createHelpEl("span", "capitalthe"));
			objs.mostvotes.appendChild(that.createHelpEl("span", "songwithmostvotes", "nowplaying"));
			objs.mostvotes.appendChild(that.createHelpEl("span", "getsplayed"));
			objs.ol.appendChild(objs.mostvotes);
			
			/*objs.allstations = document.createElement("li");
			objs.allstations.appendChild(that.createHelpEl("span", "checkout"));
			objs.allstations.appendChild(that.createHelpEl("span", "allourotherstations", "stationselect"));
			objs.ol.appendChild(objs.allstations);*/
			
			container.appendChild(that.createHelpEl("h2", "supportedplayersheader"));
			
			container.appendChild(that.createHelpEl("p", "playersogg"));
		
			objs.players = document.createElement("ul");
			
			objs.playerswin = document.createElement("li");
			objs.playerswin.appendChild(that.createHelpEl("span", "playerswindows"));
			objs.playerswin.appendChild(createEl("a", { "href": "http://www.videolan.org/vlc/", "textContent": "VLC" }));
			objs.playerswin.appendChild(createEl("span", { "textContent": ", " }));
			objs.playerswin.appendChild(createEl("a", { "href": "http://www.foobar2000.com", "textContent": "Foobar2000" }));
			objs.playerswin.appendChild(createEl("span", { "textContent": ", " }));
			objs.playerswin.appendChild(createEl("a", { "href": "http://www.winamp.com", "textContent": "Winamp 5" }));
			objs.players.appendChild(objs.playerswin);
			
			objs.playersmac = document.createElement("li");
			objs.playersmac.appendChild(that.createHelpEl("span", "playersmac"));
			objs.playersmac.appendChild(createEl("a", { "href": "http://www.sourcemac.com/?page=fstream", "textContent": "FStream" }));
			objs.playersmac.appendChild(createEl("span", { "textContent": ", " }));
			objs.playersmac.appendChild(createEl("a", { "href": "http://www.videolan.org/vlc/", "textContent": "VLC" }));
			objs.players.appendChild(objs.playersmac);
			
			/*objs.playersios = document.createElement("li");
			objs.playersios.appendChild(that.createHelpEl("span", "playersiphone"));
			objs.playersios.appendChild(createEl("span", { "textContent": "fstream, VLC" }));
			objs.players.appendChild(objs.playersios);*/
			
			container.appendChild(objs.players);
			
			objs.playerslinux = document.createElement("li");
			objs.playerslinux.appendChild(that.createHelpEl("span", "playerslinux"));
			objs.playerslinux.appendChild(createEl("a", { "href": "http://www.videolan.org/vlc/", "textContent": "VLC" }));
			objs.playerslinux.appendChild(createEl("span", { "textContent": " / GNOME: " }));
			objs.playerslinux.appendChild(createEl("a", { "href": "http://www.xinehq.de/", "textContent": "gxine" }));
			objs.playerslinux.appendChild(createEl("span", { "textContent": " / KDE: " }));
			objs.playerslinux.appendChild(createEl("a", { "href": "http://amarok.kde.org", "textContent": "Amarok" }));
			objs.playerslinux.appendChild(createEl("span", { "textContent": " / Shell: " }));
			objs.playerslinux.appendChild(createEl("a", { "href": "http://moc.daper.net", "textContent": "mocp" }));
			objs.players.appendChild(objs.playerslinux);
			
			container.appendChild(that.createHelpEl("h2", "registering"));
			
			objs.register = document.createElement("p");
			objs.register.appendChild(that.createHelpEl("span", "capitalyoucan"));
			objs.register.appendChild(that.createHelpEl("span", "registerorlogin", "username"));
			objs.register.appendChild(that.createHelpEl("span", "registereduserscan"));
			container.appendChild(objs.register);
			
			objs.logintotunein = document.createElement("p");
			objs.logintotunein1 = that.createHelpEl("span", "logintotunein");
			objs.logintotunein1.style.fontWeight = "bold";
			objs.logintotunein.appendChild(objs.logintotunein1);
			objs.logintotunein.appendChild(that.createHelpEl("span", "canbesaved"));
			container.appendChild(objs.logintotunein);
			
			objs.ratingh = that.createHelpEl("h2", "rating");
			objs.egratingsvg = svg.make({ "class": "pl_ad_albumrating", "width": theme.Rating_width, "height": svg.em * 1.4, "style": "font-size: 0.8em; margin-left: 2em;" });
			objs.egrating = Rating({ category: "song", id: 0, userrating: 4.0, siterating: 3.5, y: 1, fake: true });
			objs.egrating.enable();
			objs.egratingsvg.appendChild(objs.egrating.el);
			objs.ratingh.appendChild(objs.egratingsvg);
			container.appendChild(objs.ratingh);
			help["egrating"] = objs.egrating.grid;
			help["egfavourite"] = objs.egrating.favbutton;
			
			container.appendChild(that.createHelpEl("p", "ratingdoes"));
			
			objs.rating = document.createElement("p");
			objs.rating.appendChild(that.createHelpEl("span", "ratingissimple"));
			objs.rating.appendChild(that.createHelpEl("span", "nowplaying", [ "nowplaying", "songrating" ]))
			objs.rating.appendChild(that.createHelpEl("span", "songalbumby"));
			objs.rating.appendChild(that.createHelpEl("span", "usingratingbar", "egrating"));
			objs.rating.appendChild(that.createHelpEl("span", "ratingbarwill"));
			container.appendChild(objs.rating);
			
			objs.favourites = document.createElement("p");
			objs.favourites.appendChild(that.createHelpEl("span", "tofavourite"));
			objs.favourites.appendChild(that.createHelpEl("span", "favouritebutton", "egfavourite"));
			container.appendChild(objs.favourites);
			
			container.appendChild(that.createHelpEl("h2", "requesting"));
			
			objs.request = document.createElement("p");
			objs.request.appendChild(that.createHelpEl("span", "torequest"));
			objs.request.appendChild(that.createHelpEl("span", "clickther"));
			objs.request.appendChild(that.createHelpEl("span", "onasong"));
			objs.request.appendChild(that.createHelpEl("span", "playlist", "playlist"));
			objs.request.appendChild(that.createHelpEl("span", "willitshowup"));
			objs.request.appendChild(that.createHelpEl("span", "yourrequests", "requests"));
			container.appendChild(objs.request);
			
			objs.request2 = document.createElement("p");
			objs.request2.appendChild(that.createHelpEl("span", "givenaposition"));
			//objs.request2.appendChild(that.createHelpEl("span", "yourposition"));
			//objs.request2.appendChild(that.createHelpEl("span", "inthetabbar", "requests"));
			objs.request2.appendChild(that.createHelpEl("span", "youmusthaveavailable"));
			objs.request2.appendChild(that.createHelpEl("span", "toreorder"));
			//objs.request2.appendChild(that.createHelpEl("span", "loseplaceinline"));
			container.appendChild(objs.request2);
		};
		
		that.createHelpEl = function(type, tkey, hkeys) {
			var ne = document.createElement(type);
			ne.textContent = _l(tkey);
			if (hkeys) {
				ne.setAttribute("class", "help_key");
				if (typeof(hkeys) == "object") {
					ne.addEventListener("mouseover", function(e) {
							for (var i = 0; i < hkeys.length; i++) {
								that.highlightDest(e, hkeys[i]);
							}
						}, true);
					ne.addEventListener("mouseout", function(e) {
							for (var i = 0; i < hkeys.length; i++) {
								that.unhighlightDest(e, hkeys[i]);
							}
						}, true);
				}
				else {
					ne.addEventListener("mouseover", function(e) { that.highlightDest(e, hkeys); }, true);
					ne.addEventListener("mouseout", function(e) { that.unhighlightDest(e, hkeys); }, true);
				}
			}
			return ne;
		};
		
		that.highlightDest = function(e, dest) {
			if (help[dest] && !showing[dest]) {
				showing[dest] = {};
				showing[dest].dest = dest;
				var x = 0;
				var y = 0;
				var tpos = that.getAbsolutePos(e.currentTarget);
				tpos.y += (svg.em);
				//if (help[dest].ownerSVGElement) {
				if (help[dest].namespaceURI.indexOf("svg")) {
					showing[dest].stroke = help[dest].getAttribute("stroke");
					showing[dest].strokewidth = help[dest].getAttribute("stroke-width");
					help[dest].setAttribute("stroke", theme.helplinecolor);
					if (help[dest].nodeName == "text") help[dest].setAttribute("stroke-width", 1);
					else help[dest].setAttribute("stroke-width", 2);
					
					var m = help[dest].getScreenCTM();
					x = Math.round(m.e);
					y = Math.round(m.f);
					if (help[dest].nodeName != "path") {
						x += parseInt(help[dest].getAttribute("x"));
						y += parseInt(help[dest].getAttribute("y"));
					}
					else {
						x += svg.em;
						y += svg.em;
					}
					if (help[dest].nodeName == "text") {
						y -= (svg.em * 0.5);
						var size = help[dest].style.fontSize ? help[dest].style.fontSize : "1em";
						var weight = help[dest].style.fontWeight ? help[dest].style.fontWeight : "normal";
						if (tpos.x > x) x += measureText(help[dest].textContent, "font-size: " + size + "; font-weight: " + weight);
					}
					else if (help[dest].getAttribute("height")) {
						y += Math.round(parseInt(help[dest].getAttribute("height"))	/ 2);
					}
					if (tpos.x > x) x += 2;
					else x -= 2;
				}
				else {
					showing[dest].border = help[dest].getStyle("border");
					help[dest].style.border = "solid 2px " + theme.helplinecolor;
					var garbage = that.getAbsolutePos(obj);
					x = garbage.x;
					y = garbage.y;
				}
				if (tpos.x < x) {
					tpos.x += e.currentTarget.offsetWidth;
				}
				var w = Math.abs(x - tpos.x);
				//if (w < 30) w = 30;
				var h = Math.abs(y - tpos.y);
				//if (h < 30) h = 30;
				var aw = 3;
				showing[dest].arrowsvg = svg.make({ "width": w, "height": h });
				showing[dest].arrowsvg.style.position = "absolute";
				showing[dest].arrowsvg.style.zIndex = "1000000";
				// if dest is to the left of source and above --OR-- dest is to the right and below source, draw a \ arrow line
				if (((x < tpos.x) && (y < tpos.y)) || ((x > tpos.x) && (y > tpos.y))) {
					showing[dest].arrowsvg.appendChild(svg.makeEl("path", { "fill": theme.helplinecolor, "stroke": "#000000", "stroke-width": "1", "d": "M0,0 H" + aw + " L" + w + "," + (h - aw) + " V" + h + " H" + (w - aw) + " L0," + aw + " Z" }));
				}
				// otherwise draw a / arrow line
				else {
					showing[dest].arrowsvg.appendChild(svg.makeEl("path", { "fill": theme.helplinecolor, "stroke": "#000000", "stroke-width": "1","d": "M" + aw + "," + h + " H0 V" + (h - aw) + " L" + (w - aw) + ",0 H" + w + " V" + aw + " Z"}));
				}
				if (x < tpos.x) showing[dest].arrowsvg.style.left = x + "px";
				else showing[dest].arrowsvg.style.left = tpos.x + "px";
				if (y < tpos.y) showing[dest].arrowsvg.style.top = y + "px";
				else showing[dest].arrowsvg.style.top = tpos.y + "px";
				document.getElementById("body").appendChild(showing[dest].arrowsvg);
			}
			else if (help[dest] && showing[dest]) {
				// fade back in
			}
		};
		
		that.getAbsolutePos = function(obj) {
			var cel = obj;
			var x = 0;
			var y = 0;
			do {
				x += cel.offsetLeft;
				y += cel.offsetTop;
				if (cel.offsetParent && cel.offsetParent.scrollLeft) x -= cel.offsetParent.scrollLeft;
				if (cel.offsetParent && cel.offsetParent.scrollTop) y -= cel.offsetParent.scrollTop;
			} while (cel = cel.offsetParent);
			return { "x": x, "y": y };
		};
		
		that.unhighlightDest = function(e, dest) {
			if (showing[dest]) {
				if (help[dest].ownerSVGElement) {
					if (showing[dest].stroke) help[dest].setAttribute("stroke", showing[dest].stroke);
					else help[dest].removeAttribute("stroke");
					if (showing[dest].strokewidth) help[dest].setAttribute("stroke-width", showing[dest].strokewidth);
					else help[dest].removeAttribute("strokewidth");
					document.getElementById("body").removeChild(showing[dest].arrowsvg);
				}
				else {
					help[dest].style.border = showing[dest].border;
				}
				delete(showing[dest]);
			}
		};
		
		prefs.addPref("help", { name: "visited", defaultvalue: false, hidden: true });
		
		return that;
	}
};