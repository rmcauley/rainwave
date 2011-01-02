function HotkeyControl() {
	var callbacks = [];
	var maxid = 0;
	
	var that = {};

	that.addCallback = function(object, method, priority) {
		var newcb = { "object": object, "method": method, "id": maxid };
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
	
	that.keyPressHandle = function(evt) {
		/* handy keycodes:
				space: 32
				enter: 13
				tab: 9
				escape: 27
				backspace: 8
				a-z,A-Z: 65 to 90, 90 to 122
				numbers: 48-57 */
		for (var i = 0; i < callbacks.length; i++) {
			if (!callbacks[i].method.call(callbacks[i].object, evt)) {
				evt.cancelBubble = true;
				evt.returnValue = false;
				evt.stopPropagation();
				return false;
			}
		}
		// stop this from canceling our AJAX requests
		if (evt.keyCode) {
			var code = (evt.keyCode != 0) ? evt.keyCode : evt.charCode;
			if (code == 27) {
				evt.preventDefault();
			}
		}			
		return true;
	};
	
	// From: http://www.tedspence.com/index.php?entry=entry070503-103948
	that.stopDefaultAction = function(e) {
		//e.cancelBubble = true;
		//e.returnValue = false;
			
		//if (e.stopPropagation) {
			//e.stopPropagation();
			e.preventDefault();
		//}
	};
	
	that.preventHotkeys = function(el) {
		el.addEventListener('keypress', that.stopBubbling, true);
	}
	
	that.stopBubbling = function(e) {
		e.cancelBubble = true;
		e.returnValue = false;
		e.stopPropagation();
	};
	
	window.addEventListener('keypress', that.keyPressHandle, false);
	
	return that;
}
