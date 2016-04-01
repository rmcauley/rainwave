var API = function() {
	"use strict";

	var self = RainwaveAPI();

	self.onError = ErrorHandler.permanent_error;
	self.onErrorRemove = ErrorHandler.remove_permanent_error;
	self.onRequestError = ErrorHandler.tooltip_error;
	self.add_callback = self.addCallback;
	self.async_get = self.request;
	self.force_sync = self.forceReconnect;
	self.sync_stop = self.closePermanently;

	return self;
}();
