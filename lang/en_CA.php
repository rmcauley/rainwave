<?php
/* Rainwave 3 en_CA MASTER Language File

 |variables| are replaced by Rainwave's localization library
 |S:variable| means to suffix a number-variable using the suffixes you define here. i.e. 4th, 5th, 6th, etc.  Works only on 1-10 number scales, made for English.
 |P:variable,word| pluralizes a word (found in this file) based on variable.  Again made for English, it only uses the plural word for anything != 0 and > 1.
 
 No HTML or HTML codes allowed.  Only text.
 
 PLEASE MAKE SURE YOUR FILE IS ENCODED IN UTF-8.
 
 If making a NEW language based on this file, PLEASE RENAME $lang to $lang2 or I will not be able to include your language!
 */

$lang = array(
	// Panel Names
	"p_MainMPI" => "Tabs",
	"p_MenuPanel" => "Menu",
	"p_PlaylistPanel" => "Playlist",
	"p_PrefsPanel" => "Preferences",
	"p_SchedulePanel" => "Schedule",
	"p_NowPanel" => "Now Playing",
	"p_RequestsPanel" => "Requests",
	"p_TimelinePanel" => "Timeline",
	
	// This will produce dates like 5d 23h 10m 46s.  Change to your liking.
	"timeformat_d" => "d ",
	"timeformat_h" => "h ",
	"timeformat_m" => "m ",
	"timeformat_s" => "s ",

	// Raw Log Code
	"log_0" => "Debug",
	
	// Edi Codes
	"log_1" => "Station ID not provided to API.",
	"log_2" => "This station is currently offline due to technical difficulties.",
	"log_3" => "Please wait to use |currentlyon|.",
	
	// HTTP Codes
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
	
	// Lyre-AJAX Codes
	"log_1000" => "Oops!  You found a bug!",
	"log_1001" => "Bad JSON response from server.",
	
	// Election Codes
	"log_2000" => "Server-side error while submitting vote.",
	"log_2001" => "You must be tuned in to vote.",
	"log_2002" => "Invalid candidate ID.",
	"log_2003" => "You have already voted in this election.",
	"log_2004" => "You must wait to vote when switching between stations.",
	"log_2005" => "Candidate entry does not exist.",
	"log_2006" => "Election has already been decided.",
	"log_2007" => "You cannot vote on that election yet.",
	"log_2008" => "You must vote on the station you're tuned in to.",
	
	// Request New Codes
	"log_3000" => "Server-side error while submitting request.  Please try again.",
	"log_3001" => "You must be logged in to request.",
	"log_3002" => "You must be tuned in to request.",
	"log_3003" => "Invalid Song ID submitted.",
	"log_3004" => "Non-existent song requested.",
	"log_3005" => "You must request a song from the current station.",
	"log_3006" => "Request limit reached.",
	"log_3007" => "Song already requested.",
	"log_3008" => "Album already requested.",
	
	// Request Delete Results
	"log_4000" => "Server-side error while deleting request.  Please try again.",
	"log_4001" => "You must be logged in to change requests.",
	"log_4002" => "Client-side error while submitting change.  Please refresh your page and try again.",
	"log_4003" => "That request does not belong to you.",
	
	// Request Change Results
	"log_6000" => "Server-side error while changing request.  Please try again.",
	"log_6001" => "You must be logged in to use requests.",
	"log_6002" => "Client-side error while submitting change.  Please refresh your page and try again.",
	"log_6003" => "Client-side error while submitting change.  Please refresh your page and try again, or try a different song.",
	"log_6004" => "That request does not belong to you.",
	"log_6005" => "You have requested a song that does not exist.",
	"log_6006" => "You must request a song from the station you're tuned in to.",
	"log_6007" => "You have already requested that song.",
	"log_6008" => "You have already requested a song from that album.",
	
	// Rating Results
	"log_7000" => "Server-side error while submitting rating.  Please try again.",
	"log_7001" => "You must be logged in to rate.",
	"log_7002" => "You must be tuned in to rate.",
	"log_7003" => "Client-side error while submitting rating.  Please refresh your page and try again.",
	"log_7004" => "Client-side error while submitting rating.  Please refresh your page and try again.",
	"log_7005" => "Client-side error while submitting rating.  Please refresh your page and try again.",
	"log_7006" => "You must have been recently tuned in to that song to rate it.",
	"log_7007" => "You must wait to rate when switching between stations.",
	
	// Request Re-order Results
	"log_8000" => "Server-side error while re-ordering.  Please try again.",
	"log_8001" => "Client-side error while forming re-order request.  Please try again.",
	"log_8002" => "You have no requests to re-order.",
	"log_8003" => "One of your requests has been fulfilled.  Please try again.",
	
	// Login Results
	"log_9000" => "Invalid username or password.",
	"log_9001" => "Too many login attempts. Please go to the forums.",
	"log_9002" => "Login error.  Please use the forums.",
	
	// 10000 is used by error control for news
	
	/* Number suffixes */
	"suffix_0" => "th",
	"suffix_1" => "st",
	"suffix_2" => "nd",
	"suffix_3" => "rd",
	"suffix_4" => "th",
	"suffix_5" => "th",
	"suffix_6" => "th",
	"suffix_7" => "th",
	"suffix_8" => "th",
	"suffix_9" => "th",
	"suffix_11" => "th",
	"suffix_12" => "th",
	"suffix_13" => "th",
	
	/* Playlist Sentences */
	
	"pl_oncooldown" => "On cooldown for |time|.",
	"pl_ranks" => "Rated at |rating|, ranking |S:rank|.",
	"pl_favourited" => "Favourited by |count| |P:count,person|.",
	"pl_wins" => "Wins |percent|% of the elections it's in.",
	"pl_requested" => "Requested |count| times, ranking |S:rank|.",
	"pl_genre" => "Cooldown group: ",
	"pl_genre2" => ".",
	"pl_genres" => "Cooldown groups: ",
	"pl_genres2_normal" => ".",
	"pl_genres2_more" => " & others.",
	
	/* Preferences */
	
	"pref_refreshrequired" => "(refresh required)",
	"pref_timeline" => "Timeline",
	"pref_timeline_linear" => "Linear Timeline",
	"pref_timeline_showhistory" => "Show History",
	"pref_timeline_showelec" => "Show Election Results",
	"pref_timeline_showallnext" => "Show All Upcoming Events",
	"pref_rating_hidesite" => "Hide Site Ratings Until I've Rated",
	"pref_edi" => "General",
	"pref_edi_wipeall" => "Erase Preferences",
	"pref_edi_language" => "Language",
	"pref_edi_theme" => "Skin",
	"pref_fx" => "Effects",
	"pref_fx_fps" => "Animation Frame Rate",
	"pref_fx_enabled" => "Animation Enabled",
	"pref_mpi_showlog" => "Show Log Panel",
	"pref_requests" => "Requests",
	"pref_requests_technicalhint" => "Technical Tab Title",
	"pref_timeline_highlightrequests" => "Highlight Requests",
	
	/* About */
	
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
	
	/* Help */
	
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
	"login" => "Login or Register",
	"login_p" => "Please login.",
	"ratecurrentsong" => "Rating",
	"ratecurrentsong_p" => "Slide your mouse over the graph, and click to rate the song.|br|Album ratings are averaged from your song ratings.",
	"ratecurrentsong_t" => "Rating affects how often songs and albums are played.|br|Learn how to rate.",
	"ratecurrentsong_tp" => "Rating",
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
	"rainwave3version" => "Rainwave 3 Version",
	"revision" => "Rev",
	"crashed" => "Rainwave has crashed.",
	"submiterror" => "Please copy and paste the contents below and post them on the forums to help in debugging:",
	"pleaserefresh" => "Refresh the page to use Rainwave again.",
	
	/* Schedule Panel */
	
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
	"noschedule" => "No events planned for this week.",
	
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
	
	/* Others */
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
	"selectstation" => "Select Station",
	"tunedin" => "Tuned In",
	"tunedout" => "Tuned Out",
	"play" => "▶ Play In Browser",
	"downloadm3u" => "▶ Download M3U",
	"players" => "Supported players are VLC, Winamp, Foobar2000, and fstream (Mac/iPhone).|br|Windows Media Player and iTunes will not work.",
	"help" => "Help",
	"forums" => "Forums",
	"liveshow" => "Live Show",
	"adset" => "Advertisement",
	"onetimeplay" => "One-Time Play",
	"deleteonetime" => "Delete One-Time Play",
	"currentdj" => "dj |username|",
	"login" => "Login",
	"register" => "Register",
	"username" => "Username",
	"password" => "Password",
	"autologin" => "Auto-Login",
	"compatplayers" => "Supported Players:",
	"electionresults" => "Election Results",
	"chat" => "Chat",
	"playing" => "◼ Stop Playback",
	"loading" => "Loading",
	"searching" => "Searching: ",
	"m3uhijack" => "|plugin| is trying to hijack the M3U download.  Please right click and 'Save As.'",
	"menu_morestations" => "More ▼",
	"from" => "from |username|",
	"waitingforstatus" => "Waiting for Status",
	
	/* Words for pluralization */

	"person" => "person",
	"person_p" => "people",
	"Vote" => "Vote",
	"Vote_p" => "Votes",
);
?>