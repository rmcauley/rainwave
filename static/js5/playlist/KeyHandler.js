var KeyHandler = function() {
	"use strict";
	var self = {};

	var keymaps = {
		"QWER": {
			"activate": [ "`", "<", "'" ],
			"play": [ " " ],
			"rate10": [ "1" ],
			"rate15": [ "q" ],
			"rate20": [ "2" ],
			"rate25": [ "w" ],
			"rate30": [ "3" ],
			"rate35": [ "e" ],
			"rate40": [ "4" ],
			"rate45": [ "r" ],
			"rate50": [ "5" ],
			"vote0_0": [ "a" ],
			"vote0_1": [ "s" ],
			"vote0_2": [ "d" ],
			"vote1_0": [ "z", "y" ],
			"vote1_1": [ "x" ],
			"vote1_2": [ "c" ],
			"fave": [ "f" ]
		}
	};
	keymaps.AZER = keymaps.QWER;
	keymaps.AZER.rate15 = [ "a" ];
	keymaps.AZER.rate25 = [ "z" ];
	keymaps.AZER.vote0_0 = [ "q" ];
	keymaps.AZER.vote1_0 = [ "w" ];
	var keymap = keymaps.QWER;

	BOOTSTRAP.on_draw.push(function(template) {
		Prefs.define("hkm", [ "QWER", "AZER" ]);
		if (Prefs.get("pwr")) {
			var mapchange = function(nv) {
			if (!nv || !keymaps[nv]) {
					keymap = keymaps.QWER;
				}
				else {
					keymap = keymaps[nv];
				}

				template.hotkeys_rate10.textContent = (keymap.rate10[0] + "-" + keymap.rate50[0]).toUpperCase();
				template.hotkeys_rate05.textContent = (keymap.rate15[0] + "-" + keymap.rate45[0]).toUpperCase();
				template.hotkeys_vote0.textContent = (keymap.vote0_0[0] + "," + keymap.vote0_1[0] + "," + keymap.vote0_2[0]).toUpperCase();
				template.hotkeys_vote1.textContent = (keymap.vote1_0[0] + "," + keymap.vote1_1[0] + "," + keymap.vote1_2[0]).toUpperCase();
				template.hotkeys_fave.textContent = keymap.fave[0].toUpperCase();

				if (keymap.play == " ") {
					template.hotkeys_play.textContent = "Space";
				}
				else {
					template.hotkeys_play.textContent = keymap.play;
				}
			};
			Prefs.add_callback("hkm", mapchange);
			mapchange();
		}
	});

	var backspace_trap = false;
	var backspace_timer = false;

	// these key codes are handled by on_key_down, as browser's default behaviour
	// tend to act on them at that stage rather than on_key_press
	// backspace, escape, down, up, page up, page down, home, end, right arrow, left arrow, tab
	var keydown_handled = [ 8, 27, 38, 40, 33, 34, 36, 35, 39, 37, 9 ];

	self.prevent_default = function(evt) {
		evt.preventDefault(evt);
	};

	self.enable_backspace_trap = function() {
		if (backspace_timer) clearTimeout(backspace_timer);
		backspace_timer = setTimeout(self.disable_backspace_trap, 3000);
	};

	self.disable_backspace_trap = function() {
		backspace_timer = false;
		backspace_trap = false;
	};

	self.on_key_press = function(evt) {
		if (self.is_ignorable(evt)) return true;

		if (keydown_handled.indexOf(evt.keyCode) == -1) {
			return self.handle_event(evt);
		}
		// trap backspace so users don't accidentally navigate away from the site
		if (backspace_trap && (evt.keyCode == 8)) {
			self.prevent_default(evt);
			// no need to set enable_backspace_trap - that will already have been handled by key_down
			return false;
		}
	};

	self.on_key_down = function(evt) {
		if (self.is_ignorable(evt)) return true;
		// Short-circuit backspace on Webkit - which fires its backspace handler at the end of the keyDown bubble.
		if (evt.keyCode == 8) {
			// if event was handled, don't trap back
			backspace_trap = !self.handle_event(evt) || backspace_trap;
			if (backspace_trap) {
				self.enable_backspace_trap();
				self.prevent_default(evt);
			}
			return !backspace_trap;
		}
		// Code 27 is escape, and this stops esc from cancelling our AJAX requests by cutting it off early
		// Codes 38 and 40 are arrow keys, since Webkit browsers don't fire keyPress events on them and need to be handled here
		// All other codes should be handled by on_key_press
		else if (keydown_handled.indexOf(evt.keyCode) != -1) {
			self.handle_event(evt);
			// these keys should always return false and prevent default
			// escape, as mentioned, will cause AJAX requests to stop
			// up/down arrow keys will cause unintended scrolling of the entire page (which we want to stop)
			self.prevent_default(evt);
			return false;
		}
	};

	// this exists just to handle the timeout for when the user releases the backspace
	// user releases backspace, then X seconds later we release our backspace trap flag.
	// this stops the user from accidentally browsing away from the site while using
	// type to find, but doesn't stop them from leaving the site otherwise
	self.on_key_up = function(evt) {
		if (backspace_trap && (evt.keyCode == 8)) {
			self.enable_backspace_trap();
			self.prevent_default(evt);
			return false;
		}
	};

	self.is_ignorable = function(evt) {
		if (evt.ctrlKey || evt.altKey || evt.metaKey) return true;
		// we can't trap anything beyond here for opera without losing important keys
		if (!("charCode" in evt)) return false;
		// F1 to F12 keys
		if ((evt.charCode === 0) && (evt.keyCode >= 112) && (evt.keyCode <= 123)) return true;
		if (Sizing.simple && (evt.keyCode != 27)) return true;
		if (evt.target && evt.target.classList.contains("search_box") && (evt.keyCode != 27)) return true;
		if (document.body.classList.contains("search_open")) return true;
		return false;
	};

	self.handle_event = function(evt) {
		// thanks Quirksmode, not sure how relevant it is with present browsers though, but keeping it around
		var targ;
		if (!evt) evt = window.event;
		if (evt.target) targ = evt.target;
		else if (evt.srcElement) targ = evt.srcElement;
		if (targ.nodeType == 3) targ = targ.parentNode;  // defeat Safari bug
		//if (targ.tagName.toLowerCase() == "input") return true;  // do nothing for input fields

		if (self.is_ignorable(evt)) {
			if (evt.keyCode == 27) {
				self.prevent_default(evt);
			}
			return true;
		}

		var chr = "";
		if (!("charCode" in evt)) {
			chr = String.fromCharCode(evt.keyCode);
		}
		else if (evt.charCode > 0) {
			chr = String.fromCharCode(evt.charCode);
		}

		// a true return here means subroutines did actually handle the keys, and we need to preventDefault...
		if (self.route_key(evt.keyCode, chr, evt.shiftKey)) {
			self.prevent_default(evt);
			// ... which is unfortunately backwards from browsers, which expect "false" to stop the event bubble
			return false;
		}
		return true;
	};

	var can_route_to_detail = function() {
		return Router.active_detail && Router.active_detail._key_handle;
	};

	self.route_to_lists = function() {
		if (route_to_detail) {
			if (Router.active_list && Router.active_list.loaded) {
				Router.active_list.key_nav_focus();
			}
			if (can_route_to_detail()) {
				Router.active_detail.key_nav_blur();
			}
		}
		route_to_detail = false;
	};

	self.route_to_detail = function() {
		if (!route_to_detail && can_route_to_detail()) {
			route_to_detail = true;
			Router.active_list.key_nav_blur();
			Router.active_detail.key_nav_focus();
		}
	};

	var route_to_detail = false;
	var hotkey_mode_on = false;
	self.route_key = function(key_code, chr, shift) {
		if (hotkey_mode_on && hotkey_mode_handle(key_code, chr)) {
			return true;
		}
		else if (key_code == 96 || (keymap.activate.indexOf(chr) !== -1)) {
			return hotkey_mode_enable();
		}

		var route_to = "active_list";
		if (route_to_detail && can_route_to_detail()) {
			route_to = "active_detail";
		}
		else {
			route_to_detail = false;
			if (!Router.active_list) return;
			if (!Router.active_list.loaded) return;
		}

		var toret;
		if (key_code == 40) {			// down arrow
			return Router[route_to].key_nav_down();
		}
		else if (key_code == 38) {		// up arrow
			return Router[route_to].key_nav_up();
		}
		else if (key_code == 13) {		// enter
			return Router[route_to].key_nav_enter();
		}
		else if (/[\d\w\-.&':+~,]+/.test(chr)) {
			return Router[route_to].key_nav_add_character(chr);
		}
		else if (chr == " ") {			// spacebar
			return Router[route_to].key_nav_add_character(" ");
		}
		else if (key_code == 34) {		// page down
			return Router[route_to].key_nav_page_down();
		}
		else if (key_code == 33) {		// page up
			return Router[route_to].key_nav_page_up();
		}
		else if (key_code == 8) {		// backspace
			return Router[route_to].key_nav_backspace();
		}
		else if (key_code == 36) {		// home
			return Router[route_to].key_nav_home();
		}
		else if (key_code == 35) {		// end
			return Router[route_to].key_nav_end();
		}
		else if (key_code == 37) {		// left arrow
			toret = Router[route_to].key_nav_left();
			if (!toret && route_to_detail) {
				toret = true;
				self.route_to_lists();
			}
			return toret;
		}
		else if (key_code == 39) {		// right arrow
			toret = Router[route_to].key_nav_right();
			if (!toret && !route_to_detail && can_route_to_detail()) {
				toret = true;
				self.route_to_detail();
			}
			return toret;
		}
		else if (key_code == 27) {		// escape
			Router.active_list.key_nav_escape();
			if (can_route_to_detail()) {
				Router.active_detail.key_nav_escape();
			}
			route_to_detail = false;
			return true;
		}
		else if (key_code == 9) {		// tab
			if (shift) {
				Router.tab_backwards();
			}
			else {
				Router.tab_forward();
			}
		}

		return false;
	};

	var hotkey_mode_timeout;
	var hotkey_mode_error_timeout;

	var hotkey_mode_enable = function() {
		hotkey_mode_on = true;
		if (hotkey_mode_timeout) {
			clearTimeout(hotkey_mode_timeout);
		}
		if (hotkey_mode_error_timeout) {
			document.body.classList.remove("hotkey_error");
			clearTimeout(hotkey_mode_error_timeout);
		}
		hotkey_mode_timeout = setTimeout(hotkey_mode_disable, 4000);
		document.body.classList.add("hotkey_on");
		return true;
	};

	var hotkey_mode_disable = function() {
		if (hotkey_mode_timeout) {
			clearTimeout(hotkey_mode_timeout);
		}
		hotkey_mode_on = false;
		document.body.classList.remove("hotkey_on");
		return true;
	};

	var hotkey_mode_handle = function(key_code, character) {
		try {
			if (keymap.rate10.indexOf(character) !== -1) Timeline.rate_current_song(1.0);
			else if (keymap.rate15.indexOf(character) !== -1) Timeline.rate_current_song(1.5);
			else if (keymap.rate20.indexOf(character) !== -1) Timeline.rate_current_song(2.0);
			else if (keymap.rate25.indexOf(character) !== -1) Timeline.rate_current_song(2.5);
			else if (keymap.rate30.indexOf(character) !== -1) Timeline.rate_current_song(3.0);
			else if (keymap.rate35.indexOf(character) !== -1) Timeline.rate_current_song(3.5);
			else if (keymap.rate40.indexOf(character) !== -1) Timeline.rate_current_song(4.0);
			else if (keymap.rate45.indexOf(character) !== -1) Timeline.rate_current_song(4.5);
			else if (keymap.rate50.indexOf(character) !== -1) Timeline.rate_current_song(5.0);

			else if (keymap.play.indexOf(character) !== -1) RWAudio.play_stop();

			else if (keymap.vote0_0.indexOf(character) !== -1) Timeline.vote(0, 0);
			else if (keymap.vote0_1.indexOf(character) !== -1) Timeline.vote(0, 1);
			else if (keymap.vote0_2.indexOf(character) !== -1) Timeline.vote(0, 2);
			else if (keymap.vote1_0.indexOf(character) !== -1) Timeline.vote(1, 0); 		// quertz layout
			else if (keymap.vote1_1.indexOf(character) !== -1) Timeline.vote(1, 1);
			else if (keymap.vote1_2.indexOf(character) !== -1) Timeline.vote(1, 2);

			else if (keymap.fave.indexOf(character) !== -1) Timeline.fav_current();

			else {
				hotkey_mode_error("invalid_hotkey");
				return true;
			}
			hotkey_mode_disable();
			return true;
		}
		catch (err) {
			if ("is_rw" in err) {
				hotkey_mode_error(err.tl_key);
				return true;
			}
			else {
				throw(err);
			}
		}
	};

	var hotkey_mode_error = function(tl_key) {
		hotkey_mode_disable();
		document.body.classList.add("hotkey_error");
		document.getElementById("hotkey_error").textContent = $l(tl_key);
		hotkey_mode_error_timeout = setTimeout(function() {
			document.body.classList.remove("hotkey_error");
		}, 3000);
	};

	window.addEventListener("keydown", self.on_key_down, true);
	window.addEventListener("keypress", self.on_key_press, true);
	window.addEventListener("keyup", self.on_key_up, true);

	return self;
}();
