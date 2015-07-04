var AlbumList = function(el) {
	"use strict";
	var self = {};

	var template = RWTemplates.searchlist();
	el.appendChild(template._root);

	return self;
};