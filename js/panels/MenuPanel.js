panels.MenuPanel = {
	ytype: "fixed",
	height: 60,
	minheight: 3,
	xtype: "slack",
	width: 0,
	minwidth: 0,
	noborder: true,
	title: _l("p_MenuPanel"),
	cname: "menu",
	
	constructor: function(container) {
		var that = {};
		that.container = container;
		that.playeradded = false;
		that.el;

		theme.Extend.MenuPanel(that);
	
		that.init = function() {
			that.width = container.offsetWidth;
			that.height = container.offsetHeight;
			that.el = container;

			that.draw();
		
			var pos = help.getElPosition(that.td_news);
			errorcontrol.changeShowXY(pos.x, pos.y + that.height);
			
			user.addCallback(that.usernameCallback, "username");
			user.addCallback(that.tunedinCallback, "radio_tunedin");
			user.addCallback(that.userAvatarCallback, "user_avatar");
		};
		
		that.usernameCallback = function(username) {
			if (user.p.user_id == 1) that.showUsername("Anonymous");
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
			if (user.p.sid == 1) url = "http://gamestream.rainwave.cc:8000/rainwave.mp3" + usrstr;
			else if (user.p.sid == 2) url = "http://ocrstream.rainwave.cc:8000/ocremix.mp3" + usrstr;
			else if (user.p.sid == 3) url = "http://coverstream.rainwave.cc:8000/mixwave.mp3" + usrstr;
			else if (user.p.sid == 4) url = "http://chipstream.rainwave.cc:8000/bitwave.mp3" + usrstr;
			else if (user.p.sid == 5) url = "http://allstream.rainwave.cc:8000/omniwave.mp3" + usrstr;
			
			that.playerInitThemeHook();
			
			var flashvars = {
				"url": url,
				"lang": "en",
				"codec": "mp3",
				"volume": "100",
				"autoplay": "true",
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
				"width": 190,
				"height": 32,
				"id": "embedded_swf"
			};
			that.embedded_swf_container = createEl("div", { "id": "embedded_swf_container" }, that.flash_container);
			swfobject.embedSWF("ffmp3/muses-config.swf", that.embedded_swf_container.getAttribute("id"), "190", "32", "10.0.0", "ffmp3/expressInstall.swf", flashvars, params, attributes);
			that.player.style.background = "none"
			
			that.playeradded = true;
		};
		
		that.playerClick = function() {
			if (!that.playeradded) that.addPlayer(that.flash_container);
		};

		// this is for m3u links
		that.tuneInClickMP3 = function() {
			that.tuneInClick("");
		}
		
		that.tuneInClickOgg = function() {
			that.tuneInClick("?ogg=true");
		}
		
		that.tuneInClick = function(querystr) {
			var plugin = that.detectM3UHijack();
			if (plugin) {
				errorcontrol.doError(3, false, false, _l("m3uhijack", { "plugin": plugin }));
			}
			else {
				window.location.href = "tunein.php" + querystr;
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
			if (sid == 1) window.location.href = "http://game.rainwave.cc";
			if (sid == 2) window.location.href = "http://ocr.rainwave.cc";
			if (sid == 3) window.location.href = "http://cover.rainwave.cc";
			if (sid == 4) window.location.href = "http://chiptune.rainwave.cc";
			if (sid == 5) window.location.href = "http://all.rainwave.cc";
		};
	
		return that;
	}
};
