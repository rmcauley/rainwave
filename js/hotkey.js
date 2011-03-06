var hotkey = function() {
	var callbacks = [];
	var maxid = 0;
	
	var that = {};

	that.addCallback = function(method, priority) {
		var newcb = { "method": method, "id": maxid };
		maxid++;
		if (callbacks.length < priority) {
			callbacks.splice(priority, 0, newcb);
		}
		else {
			callbacks.push(newcb);
		}
		return newcb.id;
	};
	
	that.removeCallback = function(id) {
		for (var i = 0; i < callbacks.length; i++) {
			if (callbacks[i].id == id) {
				callbacks.splice(i, 0);
				return;
			}
		}
	};
	
	// From: http://www.tedspence.com/index.php?entry=entry070503-103948
	that.stopDefaultAction = function(e) {
		//if (e.stopPropagation) e.stopPropagation();
		if (e.preventDefault) e.preventDefault();
		//e.returnValue = false;
		//e.cancelBubble = true;
		//return false;
	};
	
	that.preventHotkeys = function(el) {
		el.addEventListener('keypress', that.stopBubbling, true);
	}
	
	that.stopBubbling = function(e) {
		e.cancelBubble = true;
		e.returnValue = false;
		e.stopPropagation();
	};
	
	that.keyPress = function(evt) {
		// one more from Quirksmode
		var targ;
		if (!evt) evt = window.event;
		if (evt.target) targ = evt.target;
		else if (evt.srcElement) targ = evt.srcElement;
		if (targ.nodeType == 3) // defeat Safari bug
		targ = targ.parentNode;
		if (targ.tagName == "input") return true;
		/* handy keycodes:
				space: 32
				enter: 13
				tab: 9
				escape: 27
				backspace: 8
				a-z,A-Z: 65 to 90, 90 to 122
				numbers: 48-57 */
		for (var i = 0; i < callbacks.length; i++) {
			if (!callbacks[i].method(evt)) {
				that.stopDefaultAction(evt);
				return false;
			}
		}
		return true;
	};
	
	that.keyPressHandler = function(evt) {
		if (evt.ctrlKey || evt.altKey || evt.metaKey) return true;
		var code = (evt.keyCode != 0) ? evt.keyCode : evt.charCode;
		if (code && (code != 8) && (code != 27)) {
			return that.keyPress(evt);
		}
	};
	
	that.keyDownHandler = function(evt) {
		if (evt.ctrlKey || evt.altKey || evt.metaKey) return true;
		var code = (evt.keyCode != 0) ? evt.keyCode : evt.charCode;
		if (code && (code == 8)) {
			return that.keyPress(evt);
		}
		// stop this from canceling our AJAX requests
		if (code && (code == 27)) {
			that.keyPress(evt);
			that.stopDefaultAction(evt);
			return false;
		}
	};
	
	window.addEventListener('keydown', that.keyDownHandler, false);
	window.addEventListener('keypress', that.keyPressHandler, false);
	
	return that;
}();