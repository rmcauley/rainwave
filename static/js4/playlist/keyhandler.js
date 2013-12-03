'use strict';

//var PlaylistKeyHandler = 
{
	var self = {};

	var backspace_trap = false;
	var backspace_timer = false;

	self.prevent_default = function(evt) {
		evt.preventDefault();
	}

	self.enable_backspace_trap = function() {
		if (backspace_timer) clearTimeout(backspace_timer);
		backspace_timer = setTimeout(self.disable_backspace_trap, 2000);
	}

	self.disable_backspace_trap = function() {
		backspace_timer = false;
		backspace_trap = false;
	}
	
	self.on_key_press = function(evt) {
		if (self.is_ignorable(evt)) return true;
		// these 4 key codes are handled by on_key_down, as browser's default behaviour 
		// tend to act on them at that stage rather than on_key_press
		if ((evt.keyCode != 8) && (evt.keyCode != 27) && (evt.keyCode != 38) && (evt.keyCode != 40)) {
			return self.handle_event(evt);
		}
		if (backspace_trap && (evt.keyCode == 8)) {
			self.prevent_default();
			// no need to set enable_backspace_trap - that will already have been handled by key_down
			return false;
		}
	};
	
	self.on_key_down = function(evt) {
		if (self.is_ignoable(evt)) return true;
		// Short-circuit backspace on Webkit - which fires its backspace handler at the end of the keyDown bubble.
		if (evt.keyCode == 8) {
			// set backspace trap to on if backspace was handled by handle_event, or keep true if backspace trap is active
			backspace_trap = self.handle_event(evt) || backspace_trap;
			return !backspace_trap;
		}
		// Code 27 is escape, and this stops esc from cancelling our AJAX requests by cutting it off early
		// Codes 38 and 40 are arrow keys, since Webkit browsers don't fire keyPress events on them and need to be handled here
		// All other codes should be handled by on_key_press
		if ((evt.keyCode == 27) || (evt.keyCode == 38) || (evt.keyCode == 40)) {
			self.handle_event(evt);
			// these keys should always return false and prevent default
			// escape, as mentioned, will cause AJAX requests to stop
			// up/down arrow keys will cause unintended scrolling of the entire page (which we want to stop)
			self.prevent_default(evt);
			return false;
		}
	};
	
	// this exists just to handle the timeout for when the user releases the backspace
	// user releases backspace, then 1 second later we release our backspace trap flag.
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
		if (!('charCode' in evt)) return false;
		// F1 to F12 keys
		if ((evt.charCode == 0) && (evt.keyCode >= 112) && (evt.keyCode <= 123)) return true;
		return false;
	};

	self.handle_event = function(evt) {
		// thanks Quirksmode, not sure how relevant it is with present browsers though, but keeping it around
		var targ;
		if (!evt) evt = window.event;
		if (evt.target) targ = evt.target;
		else if (evt.srcElement) targ = evt.srcElement;
		if (targ.nodeType == 3) targ = targ.parentNode;	 // defeat Safari bug
		if (targ.tagName == "input") return true;	// do nothing for input fields

		if (self.is_ignorable(evt)) return true;

		var chr = '';
		if (!('charCode' in evt)) {
			chr = String.fromCharCode(evt.keyCode);
		}
		else if (evt.charCode > 0) {
			chr = String.fromCharCode(evt.charCode);
		}

		// a true return here means subroutines did actually handle the keys, and we need to preventDefault...
		if (self.route_key(evt.keyCode, chr)) {
			self.prevent_default();
			// ... which is unfortunately backwards from browsers, which expect "false" to stop the event bubble
			return false;
		}
		return true;
	};

	self.route_key = function(key_code, chr) {
		if (!PlaylistLists.active_list) return false;

		if (key_code == 40) {			// down arrow
			return PlaylistLists.active_list.search_table.key_nav_down();
		}
		else if (key_code == 38) {		// up arrow
			return PlaylistLists.active_list.search_table.key_nav_up();
		}
		else if (key_code == 13) {		// enter
			return PlaylistLists.active_list.search_table.key_nav_enter();
		}
		else if (/[\d\w\-.&':+~,]+/.test(chr)) {
			return PlaylistLists.active_list.search_table.add_character(chr);
		}
		else if (chr == " ") {			// spacebar
			return PlaylistLists.active_list.search_table.add_character(" ");
		}
		else if (key_code == 8) {		// backspace
			return PlaylistLists.active_list.search_table.key_nav_backspace();
		}
		else if (key_code == 27) {		// escape
			PlaylistLists.active_list.search_table.key_nav_escape();
			return true;				// always return true for escape or browsers will halt AJAX requests (escape == stop in a browser!)
		}

		return false;
	};

	window.addEventListener('keydown', self.on_key_down, false);
	window.addEventListener('keypress', self.on_key_press, false);
	window.addEventListener('keyup', self.on_key_up, false);

	//return self;
};