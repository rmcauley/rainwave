<?php

$jsorder = array(
	// OggPixel
	// "js/swfobject.js",
	// "js/oggpixel.js",
	
	// Priority Order
	"js/prefs.js",		// Must come first for cookie load prepping other JS files
	"js/svg.js",		// Required by fx, graph, and help
	"js/fx.js",			// Required by themes
	"js/formatting.js",	// contains $ and createEl, so likely required by theme
	"js/main.js",		// Triggers theme, so required by anything below that uses the theme
	
	// Any order
	"js/clock.js",
	"js/errorcontrol.js",
	"js/edi.js",
	"js/graph.js",
	"js/help.js",
	"js/hotkey.js",
	"js/language.js",
	"js/mouse.js",
	"js/playlistobjects.js",
	"js/rating.js",
	"js/ratingcontrol.js",
	"js/swfobject.js",
	"js/titleupdate.js",
	"js/user.js",
	"js/splitwindow.js",
	"js/searchtable.js",
	
	// Panels
	"js/panels/MenuPanel.js",
	"js/panels/MainMPI.js",
	"js/panels/NowPanel.js",
	"js/panels/RequestsPanel.js",
	"js/panels/TimelinePanel.js",
	"js/panels/PlaylistPanel.js",
	"js/panels/PrefsPanel.js",
	"js/panels/SchedulePanel.js"
);

?>