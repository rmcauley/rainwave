panels.MenuPanel = {
	ytype: "fixed",
	height: 21,
	minheight: 3,
	xtype: "slack",
	width: 0,
	minwidth: 0,
	noborder: true,
	title: _l("p_MenuPanel"),
	
	constructor: function(container) {
		var that = {};
		that.container = container;
		that.playeradded = false;
		that.el;
		var loginenabled = true;
		var loginattempts = 0;

		theme.Extend.MenuPanel(that);
	
		that.init = function() {
			that.width = container.offsetWidth;
			that.height = container.offsetHeight;
			that.el = container;

			that.draw();
			
			//that.tunedinCallback(user.p.radio_tunedin);
		
			var pos = help.getElPosition(that.td_news);
			errorcontrol.changeShowXY(pos.x, pos.y + that.height);
			
			user.addCallback(that.usernameCallback, "username");
			user.addCallback(that.tunedinCallback, "radio_tunedin");
			user.addCallback(that.userAvatarCallback, "user_avatar");
			user.addCallback(that.statRestrict, "radio_statrestricted");
			lyre.addCallback(that.loginResult, "login_result");
		};
		
		that.usernameCallback = function(username) {
			if (user.p.user_id == 1) that.showAnonUser();
			else that.showUsername(username);
		};
		
		that.tunedinCallback = function(tunedin) {
			that.drawTuneInChange(tunedin);
			if (tunedin) help.continueTutorialIfRunning("tunein");
		};
		
		that.addPlayer = function(el) {
			if (that.playeradded) return;
			
			var url;
			var usrstr = user.p.user_id > 1 ? "?" + user.p.user_id + ":" + user.p.radio_listenkey : "";
			if (user.p.sid == 1) url = "http://rwstream.rainwave.cc:8000/rainwave.ogg" + usrstr;
			else if (user.p.sid == 2) url = "http://ocstream.rainwave.cc:8000/ocremix.ogg" + usrstr;
			else if (user.p.sid == 3) url = "http://mwstream.rainwave.cc:8000/mixwave.ogg" + usrstr;
			else if (user.p.sid == 4) url = "http://bitstream.rainwave.cc:8000/bitwave.ogg" + usrstr;
			
			that.playerInitThemeHook();
			
			var flashvars = {
				"url": url,
				"lang": "en",
				"codec": "ogg",
				"volume": "100",
				"autoplay": "true",
				"traking": "false",
				"tracking": "false",
				"jsevents": "false",
				"skin": "ffmp3/ffmp3-rainwave.xml",
				"title": STATIONS[user.p.sid]
			};
			var params = {
				"allowScriptAccess": "always",
				"scale": "noscale",
				"wmode": "transparent"
			};
			var attributes = {
				"width": 79,
				"height": 18,
				"id": "embedded_swf"
			};
			that.embedded_swf_container = createEl("div", { "id": "embedded_swf_container" }, that.flash_container);
			swfobject.embedSWF("ffmp3/ffmp3-config.swf", that.embedded_swf_container.getAttribute("id"), "79", "18", "10.0.0", "ffmp3/expressInstall.swf", flashvars, params, attributes);

			// var flashvars = "url=" + url + "&lang=en&codec=ogg&volume=100&autoplay=true&traking=false&tracking=false&jsevents=false&skin=ffmp3/ffmp3-rainwave.xml&title=" + STATIONS[user.p.sid];
			// //var flash = createEl("object", { "width": 115, "height": 25 });		// the other skin
			// var flash = createEl("object", { "width": 79, "height": 18 });
			// createEl("param", { "name": "movie", "value": "ffmp3/ffmp3-config.swf" }, flash);
			// createEl("param", { "name": "flashvars", "value": flashvars }, flash);
			// createEl("param", { "name": "wmode", "value": "transparent" }, flash);
			// createEl("param", { "name": "allowscriptaccess", "value": "always" }, flash);
			// createEl("param", { "name": "scale", "value": "noscale" }, flash);
			// createEl("embed", {	
				// "src": "ffmp3/ffmp3-config.swf",
				// "flashvars": flashvars,
				// "width": 79,
				// "height": 18,
				// "wmode": "transparent",
				// "allowscriptaccess": "always",
				// "type": "application/x-shockwave-flash"
			// }, flash);
			// el.appendChild(flash);
			
			that.playeradded = true;
		};
		
		that.playerClick = function() {
			if (!that.playeradded) that.addPlayer(that.flash_container);
		};

		// this is for m3u links
		that.tuneInClick = function() {
			var plugin = that.detectM3UHijack();
			if (plugin) {
				errorcontrol.doError(3, false, false, _l("m3uhijack", { "plugin": plugin }));
			}
			else {
				window.location.href = "tunein.php";
			}
			that.tuneInClickThemeHook();
		};
		
		that.userAvatarCallback = function(avatar) {
			that.changeAvatar(avatar);
		};
		
		that.helpClick = function() {
			help.showAllTopics();
		};

		// based on http://developer.apple.com/internet/webcontent/examples/detectplugins_source.html
		that.detectM3UHijack = function() {
			if (navigator.plugins && (navigator.plugins.length > 0)) {
				for (var i = 0; i < navigator.plugins.length; i++ ) {
					if (navigator.plugins[i]) {
						for (var j = 0; j < navigator.plugins[i].length; j++) {
							if (navigator.plugins[i][j].type) {
								if (navigator.plugins[i][j].type == "audio/x-mpegurl") return navigator.plugins[i][j].enabledPlugin.name;
							}
						}
					}
				}
			}
			return false;
		};
		
		that.doLogin = function(user, password, autologin) {
			if (loginattempts >= 3) loginenabled = false;
			if (loginenabled) {
				loginattempts++;
				lyre.async_get("login", { "username": user, "password": password, "autologin": autologin });
			}
		};
		
		that.loginResult = function(json) {
			if (json.code && (json.code < 0)) {
				if (loginattempts > 0) loginenabled = false;
				that.drawLoginDisabled();
			}
			else if (json.code && (json.code == 1)) {
				window.location.reload();
			}
		};
		
		that.openChat = function() {
			var chaturl = "http://widget.mibbit.com/?settings=6c1d29e713c9f8c150d99cd58b4b086b&server=irc.synirc.net&channel=%23rainwave&noServerNotices=true&noServerMotd=true&autoConnect=true";
			if (user.p.user_id > 1) {
				var re = new RegExp("[^0-9A-Za-z]", "g");
				var un = user.p.username;
				un = un.replace(re, "");
				chaturl += "&nick=" + un;
			}
			var popupWin = window.open(chaturl, 'rainwave_mibbit_window', 'width=750, height=550')
		};
		
		that.changeStation = function(sid) {
			if (sid == 1) window.location.href = "http://rw.rainwave.cc";
			if (sid == 2) window.location.href = "http://ocr.rainwave.cc";
			if (sid == 3) window.location.href = "http://mix.rainwave.cc";
		};
	
		return that;
	}
};
