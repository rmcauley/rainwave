var OneUp = function(json) {
	"use strict";
	var self = EventBase(json);
	self.check_voting = function() {};
	self.disable_voting = function() {};
	self.enable_voting = function() {};
	self.clear_voting_status = function() {};
	return self;
};