panels.MenuPanel = {
	ytype: "fixed",
	height: 21,
	minheight: 3,
	xtype: "fit",
	width: 0,
	minwidth: 0,
	title: _l("MenuPanel"),
	intitle: "MenuPanel",
	noborder: true,
	
	constructor: function(edi, container) {
		var that = {};
		that.container = container;
		that.el;
		var loginenabled = true;
		var loginattempts = 0;

		theme.Extend.MenuPanel(that);
	
		that.init = function() {
			that.width = container.offsetWidth;
			that.height = container.offsetHeight;
			that.el = container;

			that.draw();
			
			that.tunedinCallback(user.p.radio_tunedin);
			if (Oggpixel) {
				Oggpixel.onStart = that.tunedinCallback;
				Oggpixel.onStop = that.tunedinCallback;
				Oggpixel.onReady = that.oggReadyCallback;
			}
		
			var pos = help.getElPosition(that.td_news);
			errorcontrol.changeShowXY(pos.x, pos.y + container.offsetHeight);
			
			user.addCallback(that, that.usernameCallback, "username");
			user.addCallback(that, that.tunedinCallback, "radio_tunedin");
			user.addCallback(that, that.userAvatarCallback, "user_avatar");
			user.addCallback(that, that.statRestrict, "radio_statrestricted");
			ajax.addCallback(that, that.loginResult, "login_result");
		};
		
		that.usernameCallback = function(username) {
			if (user.p.user_id == 1) that.showAnonUser();
			else that.showUsername(username);
		};
		
		that.tunedinCallback = function(tunedin) {
			that.drawTuneInChange(tunedin);
			if (tunedin) help.continueTutorialIfRunning("tunein");
		};
		
		/*that.playerClick = function() {
			if (Oggpixel.player) that.playerClick2();
			else {
				that.drawTuneInChange(-1);	
				Oggpixel.onReady = that.playerClick2;
				Oggpixel.inject();
			}
		};
		
		that.playerClick2 = function() {
			if (Oggpixel.playing) {
				Oggpixel.stop();
			}
			else if (!user.p.radio_tunedin) {
				var usrstr = user.p.user_id > 1 ? "?" + user.p.user_id + ":" + user.p.radio_listenkey : "";
				if (user.p.sid == 1) Oggpixel.play("http://rwstream.rainwave.cc:8000/rainwave.ogg" + usrstr);
				if (user.p.sid == 2) Oggpixel.play("http://ocstream.rainwave.cc:8000/ocremix.ogg" + usrstr);
				if (user.p.sid == 3) Oggpixel.play("http://mwstream.rainwave.cc:8000/mixwave.ogg" + usrstr);
				
			}
		};*/

		// this is for m3u links
		that.tuneInClick = function() {
			var plugin = that.detectM3UHijack();
			if (plugin) {
				errorcontrol.doError(3, false, false, _l("m3uhijack", { "plugin": plugin }));
			}
			else {
				window.location.href = "tunein.php";
			}
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
				ajax.async_get("login", { "username": user, "password": password, "autologin": autologin });
			}
		};
		
		that.loginResult = function(json) {
			if (json.code && (json.code < 0)) {
				if (loginattempts > 0) loginenabled = false;
				that.drawLoginDisabled();
			}
			else if (json.code && (json.code == 1)) {
				window.location.reload(true);
			}
		};
		
		that.openChat = function() {
			var chaturl = "http://widget.mibbit.com/?settings=6c1d29e713c9f8c150d99cd58b4b086b&server=irc.synirc.net&channel=%23rainwave&noServerNotices=true&noServerMotd=true&autoConnect=true";
			if (user.p.user_id > 1) {
				chaturl += "&nick=" + user.p.username;
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
