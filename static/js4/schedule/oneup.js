'use strict';

var OneUp = function(json) {
	var self = EventBase(json);
	self.disable_voting = function() {};
	self.enable_voting = function() {};
	self.clear_voting_status = function() {};
	return self;
}