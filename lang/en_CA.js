/* Rainwave 3 en_CA Language File */
// |variables| are replaced by Rainwave's localization library
// |S:variable| means to suffix a number-variable using the suffixes you define here. i.e. 4th, 5th, 6th, etc.  Works only on 1-10 number scales, made for English.
// |P:variable,word| pluralizes a word (found in this file) based on variable.  Again made for English, it only uses the plural word for anything != 0 and > 1.

// Due to various levels of assinineness, please remember to save this file as UTF-8, and also remember you are not guaranteed to use HTML codes.
// I have selectively used HTML codes in only certain places - you are not guaranteed to land upon a translation line that will make use of them.

var lang = new function() {
	// Panel Names
	this.p_MainMPI = "Tabs";
	this.p_MenuPanel = "Menu";
	this.p_PlaylistPanel = "Playlist";
	this.p_PrefsPanel = "Preferences";
	this.p_SchedulePanel = "Schedule";
	this.p_NowPanel = "Now Playing";
	this.p_RequestsPanel = "Requests";
	this.p_TimelinePanel = "Timeline";
	
	// This will produce dates like 5d 23h 10m 46s.  Change to your liking.
	this.timeformat_d = "d ";
	this.timeformat_h = "h ";
	this.timeformat_m = "m ";
	this.timeformat_s = "s ";

	// Raw Log Code
	this.log_0 = "Debug";
	
	// Edi Codes
	this.log_1 = "Station ID not provided to API.";
	this.log_2 = "This station is currently offline.<br />Check <a href=\"http://twitter.com/Rainwavecc\">twitter.com/Rainwavecc</a> or the chat room for the latest updates.";
	this.log_3 = "You used |lockedto| in the last few minutes; you must wait to use |currentlyon|.";
	
	// HTTP Codes
	this.log_200 = "HTTP OK";
	this.log_300 = "HTTP Redirected";
	this.log_301 = "HTTP Moved";
	this.log_307 = "HTTP Redirected";
	this.log_400 = "HTTP Bad Request";
	this.log_401 = "HTTP Unauthorized";
	this.log_403 = "Authorization error - please refresh the page.";
	this.log_404 = "HTTP Not Found";
	this.log_408 = "HTTP Time Out";
	this.log_500 = "Technical difficulties - please try again or report a bug.";
	this.log_502 = "Technical difficulties - please wait.";
	this.log_503 = "Rainwave is experiencing a high load, please try again.";
	
	// Lyre-AJAX Codes
	this.log_1000 = "Oops!  You found a bug!";
	this.log_1001 = "Bad JSON response from server.";
	
	// Election Codes
	this.log_2000 = "Server-side error while submitting vote.";
	this.log_2001 = "You must be tuned in to vote.";
	this.log_2002 = "Invalid candidate ID.";
	this.log_2003 = "You have already voted in this election."
	this.log_2004 = "You must wait to vote when switching between stations.";
	this.log_2005 = "Candidate entry does not exist.";
	this.log_2006 = "Election has already been decided.";
	this.log_2007 = "You cannot vote on that election yet.";
	this.log_2008 = "You must vote on the station you're tuned in to."
	
	// Request New Codes
	this.log_3000 = "Server-side error while submitting request.  Please try again.";
	this.log_3001 = "You must be logged in to request.";
	this.log_3002 = "You must be tuned in to request.";
	this.log_3003 = "Invalid Song ID submitted.";
	this.log_3004 = "Non-existent song requested.";
	this.log_3005 = "You must request a song from the current station.";
	this.log_3006 = "Request limit reached.";
	this.log_3007 = "Song already requested.";
	this.log_3008 = "Album already requested.";
	
	// Request Delete Results
	this.log_4000 = "Server-side error while deleting request.  Please try again.";
	this.log_4001 = "You must be logged in to change requests.";
	this.log_4002 = "Client-side error while submitting change.  Please refresh your page and try again.";
	this.log_4003 = "That request does not belong to you.";
	
	// Request Change Results
	this.log_6000 = "Server-side error while changing request.  Please try again.";
	this.log_6001 = "You must be logged in to use requests.";
	this.log_6002 = "Client-side error while submitting change.  Please refresh your page and try again.";
	this.log_6003 = "Client-side error while submitting change.  Please refresh your page and try again, or try a different song.";
	this.log_6004 = "That request does not belong to you.";
	this.log_6005 = "You have requested a song that does not exist.";
	this.log_6006 = "You must request a song from the station you're tuned in to."
	this.log_6007 = "You have already requested that song.";
	this.log_6008 = "You have already requested a song from that album.";
	
	// Rating Results
	this.log_7000 = "Server-side error while submitting rating.  Please try again.";
	this.log_7001 = "You must be logged in to rate.";
	this.log_7002 = "You must be tuned in to rate.";
	this.log_7003 = "Client-side error while submitting rating.  Please refresh your page and try again.";
	this.log_7004 = this.log_7003;
	this.log_7005 = this.log_7003;
	this.log_7006 = "You must have been recently tuned in to that song to rate it.";
	this.log_7007 = "You must wait to rate when switching between stations.";
	
	// Request Re-order Results
	this.log_8000 = "Server-side error while re-ordering.  Please try again.";
	this.log_8001 = "Client-side error while forming re-order request.  Please try again.";
	this.log_8002 = "You have no requests to re-order.";
	this.log_8003 = "One of your requests has been fulfilled.  Please try again.";
	
	// Login Results
	this.log_9000 = "Invalid username or password.";
	this.log_9001 = "Too many login attempts. Please go to the forums.";
	this.log_9002 = "Login error.  Please use the forums.";
	
	// 10000 is used by error control for news
	
	/* Number suffixes */
	this.suffix_0 = "th";
	this.suffix_1 = "st";
	this.suffix_2 = "nd";
	this.suffix_3 = "rd";
	this.suffix_4 = "th";
	this.suffix_5 = "th";
	this.suffix_6 = "th";
	this.suffix_7 = "th";
	this.suffix_8 = "th";
	this.suffix_9 = "th";
	
	/* Playlist Sentences */
	
	this.pl_oncooldown = "<span class='pl_ad_oncooldown'>On cooldown for <b>|time|</b>.</span>";
	this.pl_ranks = "Ranks <b>|S:rank|</b>.";
	this.pl_favourited = "Favourited by <b>|count|</b> |P:count,person|.";
	this.pl_wins = "Won <b>|percent|%</b> of the elections it's in, ranking <b>|S:rank|</b>.";
	this.pl_requested = "Requested <b>|count|</b> times, ranking <b>|S:rank|</b>.";
	this.pl_genre = "Cooldown group: ";		// Due to the code structure I cannot combine these.
	this.pl_genre2 = ".";
	this.pl_genres = "Cooldown groups: ";
	this.pl_genres2 = ".";
	
	/* Preferences */
	
	this.pref_refreshrequired = "(refresh required)";
	this.pref_timeline = "Timeline";
	this.pref_timeline_linear = "Linear Timeline";
	this.pref_timeline_showhistory = "Show History";
	this.pref_timeline_showelec = "Show Election Results";
	this.pref_timeline_showallnext = "Show All Upcoming Events";
	this.pref_rating_hidesite = "Hide Site Ratings Until I've Rated";
	this.pref_edi = "General";
	this.pref_edi_wipeall = "Erase Preferences";
	this.pref_edi_language = "Language";
	this.pref_edi_theme = "Skin";
	this.pref_fx = "Effects";
	this.pref_fx_fps = "Animation Frame Rate";
	this.pref_fx_enabled = "Animation Enabled";
	this.pref_mpi_showlog = "Show Log Panel";
	this.pref_requests = "Requests";
	this.pref_requests_technicalhint = "Technical Tab Title";
	this.pref_timeline_highlightrequests = "Highlight Requests";
	
	/* About */
	
	this.creator = "Creator";
	this.rainwavemanagers = "Rainwave Staff";
	this.ocrmanagers = "OCR Radio Staff";
	this.mixwavemanagers = "Mixwave Staff";
	this.jfinalfunkjob = "Math Madman";
	this.relayadmins = "Relay Donors";
	this.specialthanks = "Thanks To";
	this.poweredby = "Powered By";
	this.customsoftware = "Custom 'Orpheus' software";
	this.donationinformation = "Donation ledger and information.";
	this.apiinformation = "API documentation.";
	
	/* Help */
	
	this.helpstart = "Start &#9654; ";
	this.helpnext = "Next &#9654; ";
	this.helplast = "Close &#9654; ";
	this.about = "About / Donations";
	this.about_p = "Staff, technology used, and donation information.";
	this.voting = "Voting";
	this.voting_p = "Each song played is part of an election.  The song with the most votes gets played next.<br /><br />Learn how to vote.";
	this.clickonsongtovote = "Click a Song to Vote";
	this.clickonsongtovote_p = "After tuning in, click on a song.<br /><br />The song with the most votes gets played next.";
	this.tunein = "Tune In";
	this.tunein_p = "Use the in-browser Flash player to tune in.<br /><br />You can also download an M3U by clicking your player's icon.";
	this.login = "Login or Register";
	this.login_p = "Please login.";
	this.ratecurrentsong = "Rating";
	this.ratecurrentsong_p = "Slide your mouse over the graph, and click to rate the song.<br /><br />Album ratings are averaged from your song ratings.";
	this.ratecurrentsong_t = "Rating affects how often songs and albums are played.<br /><br />Learn how to rate.";
	this.ratecurrentsong_tp = "Rating";
	this.setfavourite = "Favourites";
	this.setfavourite_p = "Click the box at the end of the ratings bar to set, or unset, your favourites.";
	this.playlistsearch = "Playlist Search";
	this.playlistsearch_p = "With the playlist open, simply start typing to run a playlist search.<br /><br />Use your mouse or up/down keys to navigate.";
	this.request = "Requests";
	this.request_p = "Requesting gets the songs you want into an election.<br /><br />Learn how to request.";
	this.openanalbum = "Open an Album";
	this.openanalbum_p = "Click an album in the playlist panel.<br /><br />Albums at the bottom of the playlist are on cooldown and cannot be requested.";
	this.clicktorequest = "Make a Request";
	this.clicktorequest_p = "Click the R button to make a request.<br /><br />Songs at the bottom of the album are on cooldown and cannot be requested.";
	this.managingrequests = "Drag and Drop Requests";
	this.managingrequests_p = "Drag and drop to re-order your requests, or click X to delete one of them.";
	this.timetorequest = "Request Status";
	this.timetorequest_p = "Your request status is indicated here.<br /><br />If it indicates \"Expiring\" or \"Cooldown\", you should change your #1 request.";
	
	/* Schedule Panel */
	
	this.newliveshow = "New Live Show";
	this.newliveexplanation = "Time can be 0 (now) or an epoch time in UTC.";
	this.time = "Time";
	this.name = "Name";
	this.notes = "Notes";
	this.user_id = "User ID";
	this.addshow = "Add Show";
	this.start = "Start";
	this.end = "End";
	this['delete'] = "Delete";
	this.lengthinseconds = "Length in Seconds";
	this.djblock = "DJ Block?";
	this.djadmin = "DJ Admin";
	this.pausestation = "Pause Station";
	this.endpause = "End Pause";
	this.getready = "Get Ready";
	this.standby = "Standby";
	this.mixingok = "Mixing On";
	this.connect = "Connect";
	this.HOLD = "HOLD";
	this.onair = "Live";
	this.endnow = "End Show";
	this.wrapup = "Wrap Up";
	this.dormant = "Dormant";
	this.OVERTIME = "OVERTIME";
	this.noschedule = "No events planned for this week.";
	
	// Requests
	this.requestok = "Requested";
	this.reqexpiring = " (expiring!)";
	this.reqfewminutes = " (a few minutes)";
	this.reqsoon = " (soon)";
	this.reqshortwait = " (short wait)";
	this.reqwait = " (waiting)";
	this.reqlongwait = " (long wait)";
	this.reqoncooldown = " (on cooldown)";
	this.reqempty = " (empty)";
	this.reqwrongstation = " (wrong station)";
	this.reqtechtitlefull = " (|station||S:position| with |requestcount|)";
	this.reqtechtitlesimple = " (|station||requestcount|)";
	
	/* Others */
	this.nowplaying = "Now Playing";
	this.requestedby = "Requested by |requester|";
	this.oncooldownfor = "On cooldown for |cooldown|.";
	this.conflictedwith = "Conflicted with request by |requester|";
	this.conflictswith = "Conflicts with request by |requester|.";
	this.election = "Election";
	this.previouslyplayed = "Previously Played";
	this.votes = "|votes| |P:votes,Vote|";
	this.votelockingin = "Vote locking in |timeleft|...";
	this.submittingvote = "Submitting vote...";
	this.voted = "Voted";
	this.selectstation = "Select Station";
	this.tunedin = "Tuned In";
	this.tunedout = "Tuned Out";
	this.play = "&#9654; Play In Browser";
	this.help = "Help";
	this.forums = "Forums";
	this.liveshow = "Live Show";
	this.adset = "Advertisement";
	this.onetimeplay = "One-Time Play";
	this.deleteonetime = "Delete One-Time Play";
	this.currentdj = "dj |username|";
	this.login = "Login";
	this.register = "Register";
	this.username = "Username";
	this.password = "Password";
	this.autologin = "Auto-Login";
	this.compatplayers = "Supported Players:";
	this.electionresults = "Election Results";
	this.chat = "Chat";
	this.playing = "&#9633; Stop Playback";
	this.loading = "Loading";
	this.searching = "Searching: ";
	this.m3uhijack = "|plugin| is trying to hijack the M3U download.  Please right click and 'Save As.'";
	this.menu_morestations = "More &#9660;"
	this.from = "from |username|";
	
	/* Words for pluralization */

	this.person = "person";
	this.person_p = "people";
	this.Vote = "Vote";
	this.Vote_p = "Votes";

};
