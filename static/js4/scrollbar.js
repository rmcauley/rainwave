'use strict';

// Used this as a template: http://www.script-tutorials.com/custom-scrollbars-cross-browser-solution/
// Heavily modified to update it to CSS3 and my coding style

var Scrollbar = function() {
	var self = {};

	var scrollbars = [];

	self.refresh_all_scrollbars = function() {
		for (var i = 0; i < scrollbars.length; i++) {
			scrollbars[i].update_scroll_height();
		}
	};

	self.new = function(element) {
		var self = {};
		var handle = element.insertBefore($el("div", { "class": "scrollbar"}), element.firstChild);
		var scroll_height;
		var offset_height;
		var scrollpx_per_handlepx;
		var handlepx_per_scrollpx;
		var scrolling = false;
		var original_mouse_y;

		self.update_scroll_height = function(force_height) {
			scroll_height = force_height || element.scrollHeight;
			offset_height = element.offsetHeight;
			scrollpx_per_handlepx = scroll_height / offset_height;
			handlepx_per_scrollpx = offset_height / scroll_height;

			// updates the handle to be the correct percentage of the screen, never less than 10% for size issues
			if ((scroll_height == 0) || (offset_height == 0) || (scrollpx_per_handlepx <= 1)) {
				handle.style.opacity = "0";
			}
			else {
				handle.style.opacity = "0.5";
				handle.style.height = Math.round(Math.max(handlepx_per_scrollpx, 0.1) * offset_height) + "px";
				update_handle_position();
			}
		};

		var update_handle_position = function() {
			handle.style.marginTop = Math.round(element.scrollTop * handlepx_per_scrollpx) + "px";
		};

		var mouse_move = function(e) {
			element.scrollTop = element.scrollTop - ((e.screenY - original_mouse_y) * scrollpx_per_handlepx)
			update_handle_position();
		};

		var mouse_down = function(e) {
			if (scrolling) return;
			original_mouse_y = e.screenY;
			window.addEventListener("mousemove", mouse_move, false);
			window.addEventListener("mouseup", mouse_up, false);
		};

		var mouse_up = function(e) {
			window.removeEventListener("mousemove", mouse_move, false);
			window.removeEventListener("mouseup", mouse_move, false);
		};

		var mouse_wheel = function(e) {
			element.scrollTop = element.scrollTop + (e.deltaY * 6);
			update_handle_position();
		};

		handle.addEventListener("mousedown", mouse_down, false);
		addWheelListener(element, mouse_wheel);

		scrollbars.push(self);
		return self;
	};

	return self;
}();

// ************* MOUSE WHEEL SUPPORT
// https://developer.mozilla.org/en-US/docs/Web/Reference/Events/wheel?redirectlocale=en-US&redirectslug=DOM%2FMozilla_event_reference%2Fwheel

// creates a global "addWheelListener" method
// example: addWheelListener( elem, function( e ) { console.log( e.deltaY ); e.preventDefault(); } );
(function(window,document) {

    var prefix = "", _addEventListener, onwheel, support;

    // detect event model
    if ( window.addEventListener ) {
        _addEventListener = "addEventListener";
    } else {
        _addEventListener = "attachEvent";
        prefix = "on";
    }

    // detect available wheel event
    support = "onwheel" in document.createElement("div") ? "wheel" : // Modern browsers support "wheel"
              document.onmousewheel !== undefined ? "mousewheel" : // Webkit and IE support at least "mousewheel"
              "DOMMouseScroll"; // let's assume that remaining browsers are older Firefox

    window.addWheelListener = function( elem, callback, useCapture ) {
        _addWheelListener( elem, support, callback, useCapture );

        // handle MozMousePixelScroll in older Firefox
        if( support == "DOMMouseScroll" ) {
            _addWheelListener( elem, "MozMousePixelScroll", callback, useCapture );
        }
    };

    function _addWheelListener( elem, eventName, callback, useCapture ) {
        elem[ _addEventListener ]( prefix + eventName, support == "wheel" ? callback : function( originalEvent ) {
            !originalEvent && ( originalEvent = window.event );

            // create a normalized event object
            var event = {
                // keep a ref to the original event object
                originalEvent: originalEvent,
                target: originalEvent.target || originalEvent.srcElement,
                type: "wheel",
                deltaMode: originalEvent.type == "MozMousePixelScroll" ? 0 : 1,
                deltaX: 0,
                delatZ: 0,
                preventDefault: function() {
                    originalEvent.preventDefault ?
                        originalEvent.preventDefault() :
                        originalEvent.returnValue = false;
                }
            };
            
            // calculate deltaY (and deltaX) according to the event
            if ( support == "mousewheel" ) {
                event.deltaY = - 1/40 * originalEvent.wheelDelta;
                // Webkit also support wheelDeltaX
                originalEvent.wheelDeltaX && ( event.deltaX = - 1/40 * originalEvent.wheelDeltaX );
            } else {
                event.deltaY = originalEvent.detail;
            }

            // it's time to fire the callback
            return callback( event );

        }, useCapture || false );
    }

})(window,document);