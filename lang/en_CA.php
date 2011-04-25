<?php
/* Rainwave 3 en_CA MASTER Language File

 |variables| are replaced by Rainwave's localization library
 |S:variable| means to suffix a number-variable using the suffixes you define here. i.e. 4th, 5th, 6th, etc.  Works only on 1-10 number scales, made for English.
 |P:variable,word| pluralizes a word (found in this file) based on variable.  Again made for English, it only uses the plural word for anything != 0 and > 1.
 
 Some examples:
 
 This song has |favourites| favourites                       -----> This song has 5 favourites
 This song ranks |S:variables|                               -----> This song ranks 5th                    (5 followed by "suffix_5")
 Has been favourited by |favourites| |P:favourites,person|   -----> Has been favouirted by 5 people        ("person_p" gets used)
 Has been favourited by |favourites| |P:favourites,person|   -----> Has been favouirted by 1 person        ("person" gets used)
 
 No HTML or HTML codes allowed.  Only text.
 
 PLEASE MAKE SURE YOUR FILE IS ENCODED IN UTF-8.
 
 If making a NEW language based on this file, PLEASE RENAME $lang to $lang2 or I will not be able to include your language!
 */

$lang = array(
	"_SITEDESCRIPTIONS" => array(
		// Rainwave's description as it appears to search engines.
		1 => "Streaming Video Game Music Radio.  Vote for the song you want to hear!",
		// OCR Radio's description as it appears to search engines.
		2 => "OverClocked Remix Radio.  Vote for your favourite remixes!",
		// Mixwave's.
		3 => "Video game cover bands and remixes.  Vote for your favourite artists!"
	),
	
	// Panel Names, these show up in the tab titles
	"p_MainMPI" => "Tabs",
	"p_MenuPanel" => "Menu",
	"p_PlaylistPanel" => "Playlist",
	"p_PrefsPanel" => "Preferences",
	"p_SchedulePanel" => "Schedule",
	"p_NowPanel" => "Now Playing",
	"p_RequestsPanel" => "Requests",
	"p_TimelinePanel" => "Timeline",
	
	// These are used for cooldown times, e.g. 5d 23h 10m 46s.  Change to your liking.
	"timeformat_d" => "d ",
	"timeformat_h" => "h ",
	"timeformat_m" => "m ",
	"timeformat_s" => "s ",

	// Edi error codes
	"log_1" => "Station ID not provided to API.",
	"log_2" => "This station is currently offline due to technical difficulties.",
	"log_3" => "Please wait to use |currentlyon|.",
	
	// HTTP error codes
	"log_200" => "HTTP OK",
	"log_300" => "HTTP Redirected",
	"log_301" => "HTTP Moved",
	"log_307" => "HTTP Redirected",
	"log_400" => "HTTP Bad Request",
	"log_401" => "HTTP Unauthorized",
	"log_403_anon" => "Someone else on your IP address is already using Rainwave.  Please register to solve this problem.",
	"log_403_reg" => "API Authorization Error - Please refresh the page.",
	"log_404" => "HTTP Not Found",
	"log_408" => "HTTP Time Out",
	"log_500" => "Technical difficulties - please try again or report a bug.",
	"log_502" => "Technical difficulties - please wait.",
	"log_503" => "Rainwave is experiencing a high load, please try again.",
	
	// Lyre-AJAX Codes, these should NEVER show up...
	"log_1000" => "Oops!  You found a bug!",
	"log_1001" => "Bad JSON response from server.",
	
	// Election Errors
	"log_2000" => "Server-side error while submitting vote.",
	"log_2001" => "You must be tuned in to vote.",
	"log_2002" => "Invalid candidate ID.",
	"log_2003" => "You have already voted in this election.",
	"log_2004" => "You must wait to vote when switching between stations.",
	"log_2005" => "Candidate entry does not exist.",
	"log_2006" => "Election has already been decided.",
	"log_2007" => "You cannot vote on that election yet.",
	"log_2008" => "You must vote on the station you're tuned in to.",
	
	// Making-a-Request Errors
	"log_3000" => "Server-side error while submitting request.  Please try again.",
	"log_3001" => "You must be logged in to request.",
	"log_3002" => "You must be tuned in to request.",
	"log_3003" => "Invalid Song ID submitted.",
	"log_3004" => "Non-existent song requested.",
	"log_3005" => "You must request a song from the current station.",
	"log_3006" => "Request limit reached.",
	"log_3007" => "Song already requested.",
	"log_3008" => "Album already requested.",
	
	// Request Deletion Errors
	"log_4000" => "Server-side error while deleting request.  Please try again.",
	"log_4001" => "You must be logged in to change requests.",
	"log_4002" => "Client-side error while submitting change.  Please refresh your page and try again.",
	"log_4003" => "That request does not belong to you.",
	
	// Request Change Errors (swapping 1 request for another)
	"log_6000" => "Server-side error while changing request.  Please try again.",
	"log_6001" => "You must be logged in to use requests.",
	"log_6002" => "Client-side error while submitting change.  Please refresh your page and try again.",
	"log_6003" => "Client-side error while submitting change.  Please refresh your page and try again, or try a different song.",
	"log_6004" => "That request does not belong to you.",
	"log_6005" => "You have requested a song that does not exist.",
	"log_6006" => "You must request a song from the station you're tuned in to.",
	"log_6007" => "You have already requested that song.",
	"log_6008" => "You have already requested a song from that album.",
	
	// Rating Errors
	"log_7000" => "Server-side error while submitting rating.  Please try again.",
	"log_7001" => "You must be logged in to rate.",
	"log_7002" => "You must be tuned in to rate.",
	"log_7003" => "Client-side error while submitting rating.  Please refresh your page and try again.",
	"log_7004" => "Client-side error while submitting rating.  Please refresh your page and try again.",
	"log_7005" => "Client-side error while submitting rating.  Please refresh your page and try again.",
	"log_7006" => "You must have been recently tuned in to that song to rate it.",
	"log_7007" => "You must wait to rate when switching between stations.",
	
	// Request Re-order Errors
	"log_8000" => "Server-side error while re-ordering.  Please try again.",
	"log_8001" => "Client-side error while forming re-order request.  Please try again.",
	"log_8002" => "You have no requests to re-order.",
	"log_8003" => "One of your requests has been fulfilled.  Please try again.",
	
	// Login Errors
	"log_9000" => "Invalid username or password.",
	"log_9001" => "Too many login attempts. Please go to the forums.",
	"log_9002" => "Login error.  Please use the forums.",
	
	/* Suffixes 101:
		Rainwave's language library uses the following, in order:
			1. The whole number's suffix
			2. Number modulus 100's suffix
			3. Number modulus 10's suffix
			4. No suffix
		Given the number 1113, Rainwave will look for the following:
			1. "suffix_1113"
			2. "suffix_113"
			3. "suffix_13"
			4. "suffix_3"
		Whichever suffix exists first gets used.  If no suffix existed, Rainwave would just use "3."
		You cannot replace the number here, nor does Rainwave have support for multiple suffixes for languages which
			use different counters for different types of objects.
	*/
	// English example:
	// "suffix_2" => "nd"     // results in "2nd" when suffixes are used
	
	// Playlist Tabs
	"pltab_albums" => "Albums",
	"pltab_artists" => "Artists",
	
	// Playlist Sentences, these all show up in the album detail pages.
	
	"pl_oncooldown" => "On cooldown for |time|.",
	"pl_ranks" => "Rated at |rating|, ranking |S:rank|.",
	"pl_favourited" => "Favourited by |count| |P:count,person|.",
	"pl_wins" => "Wins |percent|% of the elections it's in.",
	"pl_requested" => "Requested |count| |P:count,time_count|, ranking |S:rank|.",
	"pl_genre" => "Cooldown group: ",
	"pl_genre2" => ".",
	"pl_genres" => "Cooldown groups: ",
	// If there's more than 3 cooldown groups across all songs in an album, Rainwave truncates the list and uses " & others."
	// So you'll see "Cooldown groups: foo, bar, baz, & others." if there's more than 3.  But if only 3 exist: "Cooldown groups: foo, bar, baz."
	"pl_genres2_normal" => ".",
	"pl_genres2_more" => " & others.",
	
	// Preference names
	
	"pref_refreshrequired" => "(refresh required)",
	"pref_timeline" => "Timeline",
	"pref_timeline_linear" => "Linear Timeline",
	"pref_timeline_showhistory" => "Show History",
	"pref_timeline_showelec" => "Show Election Results",
	"pref_timeline_showallnext" => "Show All Upcoming Events",
	"pref_rating_hidesite" => "Hide Global Ratings Until I've Rated",
	"pref_edi" => "General",
	"pref_edi_wipeall" => "Erase Preferences",
	"pref_edi_wipeall_button" => "Erase",
	"pref_edi_language" => "Language",
	"pref_edi_theme" => "Theme",
	"pref_edi_resetlayout" => "Reset Layout",
	"pref_edi_resetlayout_button" => "Reset",
	"pref_fx" => "Effects",
	"pref_fx_fps" => "Animation Frame Rate",
	"pref_fx_enabled" => "Animation Enabled",
	"pref_requests" => "Requests",
	"pref_requests_technicalhint" => "Technical Tab Title",
	"pref_timeline_highlightrequests" => "Show Requesters By Default",
	
	// About screen
	
	"creator" => "Creator",
	"rainwavemanagers" => "Rainwave Staff",
	"ocrmanagers" => "OCR Radio Staff",
	"mixwavemanagers" => "Mixwave Staff",
	"jfinalfunkjob" => "Math Madman",
	"relayadmins" => "Relay Donors",
	"specialthanks" => "Thanks To",
	"poweredby" => "Powered By",
	"customsoftware" => "Custom 'Orpheus' software",
	"donationinformation" => "Donation ledger and information.",
	"apiinformation" => "API documentation.",
	"translators" => "Translators",
	"rainwave3version" => "Rainwave 3 Version",
	"revision" => "Rev",
	
	// Help
	// Careful, a lot of those funny blocks are there because Courier New doesn't have the UTF-8 arrow icons.
	// "blank" is a header
	// "blank_p" is an explanatory paragraph, part of a tutorial
	// "blank_t" is the short explanation of what tutorial follows when you click on the help box
	
	"helpstart" => "Start ▶ ",
	"helpnext" => "Next ▶ ",
	"helplast" => "Close ▶ ",
	"about" => "About / Donations",
	"about_p" => "Staff, technology used, and donation information.",
	"voting" => "Voting",
	"voting_p" => "Each song played is part of an election.  The song with the most votes gets played next.|br|Learn how to vote.",
	"clickonsongtovote" => "Click a Song to Vote",
	"clickonsongtovote_p" => "After tuning in, click on a song.|br|The song with the most votes gets played next.",
	"tunein" => "Tune In",
	"tunein_p" => "Download the M3U and use your media player to listen.|br|VLC, Winamp, Foobar2000, and fstream (Mac) recommended.",
	"login_p" => "Please login.",
	"ratecurrentsong" => "Rating",
	"ratecurrentsong_p" => "Slide your mouse over the graph, and click to rate the song.|br|Album ratings are averaged from your song ratings.",
	"ratecurrentsong_t" => "Rating affects how often songs and albums are played.|br|Learn how to rate.",
	"setfavourite" => "Favourites",
	"setfavourite_p" => "Click the box at the end of the ratings bar to set, or unset, your favourites.",
	"playlistsearch" => "Playlist Search",
	"playlistsearch_p" => "With the playlist open, simply start typing to run a playlist search.|br|Use your mouse or up/down keys to navigate.",
	"request" => "Requests",
	"request_p" => "Requesting gets the songs you want into an election.|br|Learn how to request.",
	"openanalbum" => "Open an Album",
	"openanalbum_p" => "Click an album in the playlist panel.|br|Albums at the bottom of the playlist are on cooldown and cannot be requested.",
	"clicktorequest" => "Make a Request",
	"clicktorequest_p" => "Click the R button to make a request.|br|Songs at the bottom of the album are on cooldown and cannot be requested.",
	"managingrequests" => "Drag and Drop Requests",
	"managingrequests_p" => "Drag and drop to re-order your requests, or click X to delete one of them.",
	"timetorequest" => "Request Status",
	"timetorequest_p" => "Your request status is indicated here.|br|If it indicates \"Expiring\" or \"Cooldown\", you should change your #1 request.",
	
	// What happens when RW crashes
	
	"crashed" => "Rainwave has crashed.",
	"submiterror" => "Please copy and paste the contents below and post them on the forums to help in debugging:",
	"pleaserefresh" => "Refresh the page to use Rainwave again.",
	
	// Schedule Panel Administration Functions, does not need to be translated.
	
	"newliveshow" => "New Live Show",
	"newliveexplanation" => "Time can be 0 (now) or an epoch time in UTC.",
	"time" => "Time",
	"name" => "Name",
	"notes" => "Notes",
	"user_id" => "User ID",
	"addshow" => "Add Show",
	"start" => "Start",
	"end" => "End",
	"delete" => "Delete",
	"lengthinseconds" => "Length in Seconds",
	"djblock" => "DJ Block?",
	"djadmin" => "DJ Admin",
	"pausestation" => "Pause Station",
	"endpause" => "End Pause",
	"getready" => "Get Ready",
	"standby" => "Standby",
	"mixingok" => "Mixing On",
	"connect" => "Connect",
	"HOLD" => "HOLD",
	"onair" => "Live",
	"endnow" => "End Show",
	"wrapup" => "Wrap Up",
	"dormant" => "Dormant",
	"OVERTIME" => "OVERTIME",
	
	// Schedule Panel user text.

	"noschedule" => "No events planned for this week.",
	
	// Searching Related
	
	"escapetoclear" => "[esc] to clear",
	"searchheader" => "Search: ",
	
	// Requests
	
	"requestok" => "Requested",
	"reqexpiring" => " (expiring!)",
	"reqfewminutes" => " (a few minutes)",
	"reqsoon" => " (soon)",
	"reqshortwait" => " (short wait)",
	"reqwait" => " (waiting)",
	"reqlongwait" => " (long wait)",
	"reqoncooldown" => " (on cooldown)",
	"reqempty" => " (empty)",
	"reqwrongstation" => " (wrong station)",
	"reqtechtitlefull" => " (|station||S:position| with |requestcount|)",
	"reqtechtitlesimple" => " (|station||requestcount|)",
	"reqexpiresin" => " (place in line expires in |expiretime|)",
	"reqexpiresnext" => " (place in list expires next request)",
	"reqnorequests" => "No Requests Submitted",
	"reqmyrequests" => "My Requests",
	"reqrequestline" => "Request Line",
	"reqrequestlinelong" => "First |showing| of |linesize| In Line",
	"reqalbumblocked" => "Blocked; album is in an election.",
	"reqgroupblocked" => "Blocked; cooldown group is in an election.",
	
	// Now Playing and Timeline panels

	"nowplaying" => "Now Playing",
	"remixdetails" => "Remix Details",
	"songhomepage" => "Song Homepage",
	"requestedby" => "Requested by |requester|",
	"oncooldownfor" => "On cooldown for |cooldown|.",
	"conflictedwith" => "Conflicted with request by |requester|",
	"conflictswith" => "Conflicts with request by |requester|.",
	"election" => "Election",
	"previouslyplayed" => "Previously Played",
	"votes" => "|votes| |P:votes,Vote|",
	"votelockingin" => "Vote locking in |timeleft|...",
	"submittingvote" => "Submitting vote...",
	"voted" => "Voted",
	"liveshow" => "Live Show",
	"adset" => "Advertisement",
	"onetimeplay" => "One-Time Play",
	"deleteonetime" => "Delete One-Time Play",
	"currentdj" => "dj |username|",
	"electionresults" => "Election Results",
	"from" => "from |username|",
	
	// Menu Bar
	
	"selectstation" => "Select Station",
	"tunedin" => "Tuned In",
	"tunedout" => "Tuned Out",
	"play" => "▶ Play In Browser",
	"downloadm3u" => "▶ Download M3U",
	"players" => "Supported players are VLC, Winamp, Foobar2000, and fstream (Mac/iPhone).|br|Windows Media Player and iTunes will not work.",
	"help" => "Help",
	"forums" => "Forums",
	"login" => "Login",
	"logout" => "Logout",	
	"register" => "Register",
	"username" => "Username",
	"password" => "Password",
	"autologin" => "Auto-Login",
	"compatplayers" => "Supported Players:",
	"chat" => "Chat",
	"playing" => "◼ Stop Playback",
	"loading" => "Loading",
	"searching" => "Searching: ",
	"m3uhijack" => "|plugin| is trying to hijack the M3U download.  Please right click and 'Save As.'",
	"menu_morestations" => "More ▼",
	"waitingforstatus" => "Waiting for Status",
	"managekeys" => "Manage API Keys"
);
?>
