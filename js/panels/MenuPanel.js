panels.MenuPanel = {
	ytype: "fixed",
	height: 20,
	minheight: 3,
	xtype: "fit",
	width: 0,
	minwidth: 0,
	title: "Menu",
	intitle: "MenuPanel",
	noborder: true,
	
	constructor: function(edi, container) {
		var that = {};
		that.container = container;
		that.el;
		var loginenabled = true;

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
			//ajax.addCallback(that, that.loginResult, "loginresult");
		};
		
		that.usernameCallback = function(username) {
			if (user.p.user_id == 1) that.showAnonUser();
			else that.showUsername(username);
		};
		
		that.tunedinCallback = function(tunedin) {
			that.drawTuneInChange(tunedin);
			if (tunedin) help.continueTutorialIfRunning("tunein");
		};
		
		that.playerClick = function() {
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
				if (user.p.user_id > 1)	Oggpixel.play("http://substream.rainwave.cc:8000/rainwave.ogg?" + user.p.user_id + ":" + user.p.radio_listenkey);
				else Oggpixel.play("http://substream.rainwave.cc:8000/rainwave.ogg");	
			}
		};

		// this is for m3u links
		that.tuneInClick = function() {
			var plugin = that.detectM3UHijack();
			if (plugin) {
				errorcontrol.doError(3, false, false, plugin + _l("m3uhijack"));
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
			if (loginenabled) {
				ajax.async_get("login", { "username": user, "password": password, "autologin": autologin });
			}
		};
		
		that.loginResult = function(json) {
			if (json.code && (json.code < 0)) {
				loginenabled = 0;
				that.drawLoginDisabled();
			}
			else if (json.code && (json.code == 1)) {
				that.hideLoginBox();
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
			if (sid == 2) window.location.href = "http://ocremix.rainwave.cc";
			if (sid == 3) window.location.href = "http://mixwave.rainwave.cc";
		};
		
		return that;
	}
};
