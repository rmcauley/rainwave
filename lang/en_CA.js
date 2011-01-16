/* Rainwave 3 en_CA Language File */

var lang = new function() {
	// Panel Names
	this.p_COGBanner = "COG Banner";
	this.p_LogoPanel = "Logo/Status";
	this.p_LogPanel = "Debug Log";
	this.p_MainMPI = "Main Panel";
	this.p_NowPanel = "Now Playing";
	this.p_RequestsPanel = "Requests";
	this.p_SlackPanel = "Slack Test";
	this.p_TimelinePanel = "Timeline";
	
	// Skin Names
	this.s_RainwaveClassic = "Rainwave Classic";

	// Raw Log Code
	this.log_0 = "Debug";
	
	// Edi Codes
	this.log_1 = "Station ID not provided to API.";
	this.log_2 = "This station is currently offline.<br />Check <a href=\"http://twitter.com/Rainwavecc\">twitter.com/Rainwavecc</a> or the chat room for the latest updates.";
	// this.log_3 is an M3U hijack
	this.m3uhijack = " is trying to hijack the M3U download.  Please right click and 'Save As.'";
	
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
	this.log_2003 = "You've already voted in that election.";
	this.log_2004 = "You must wait to vote when switching between stations.";
	this.log_2005 = "Candidate entry does not exist.";
	this.log_2006 = "You cannot vote on that election this early.";
	this.log_2007 = "Wrong station.  Please switch to the correct station.";
	
	// Request New Codes
	this.log_3000 = "Server-side error while submitting request.  Please try again.";
	this.log_3001 = "You must be logged in to request.";
	this.log_3002 = "You must be tuned in to request.";
	this.log_3003 = "Client-side error while submitting request.  Please refresh your page and try again.";
	this.log_3004 = "You have reached the maximum number of requests.";
	this.log_3005 = "You've already requested that song.";
	this.log_3006 = "You've already requested a song from that album.";
	this.log_3007 = "That song is on cooldown.";
	this.log_3500 = "Request submitted successfully.";
	
	// Request Delete Results
	this.log_4000 = "Server-side error while deleting request.  Please try again.";
	this.log_4001 = "You must be logged in to change requests.";
	this.log_4002 = "Client-side error while submitting change.  Please refresh your page and try again.";
	this.log_4003 = "That request does not belong to you.";
	
	/*// Request Swap Results
	this.log_5000 = "Server-side error while re-ordering requests.  Please try again.";
	this.log_5001 = "You must be logged in to re-order requests.";
	this.log_5002 = "Client-side error while submitting re-order.  Please refresh your page and try again.";
	this.log_5003 = "One of the requests being re-ordered does not belong to you.";*/
	
	// Request Change Results
	this.log_6000 = "Server-side error while changing request.  Please try again.";
	this.log_6001 = "You must be logged in to use requests.";
	this.log_6002 = "Client-side error while submitting change.  Please refresh your page and try again.";
	this.log_6003 = "Client-side error while submitting change.  Please refresh your page and try again, or try a different song.";
	this.log_6004 = "That request does not belong to you.";
	this.log_6005 = "You have requested a song that does not exist.";
	this.log_6006 = "You have already requested that song.";
	this.log_6007 = "You have already requested a song from that album.";
	
	// Rating Results
	this.log_7000 = "Server-side error while submitting rating.  Please try again.";
	this.log_7001 = "You must be logged in to rate.";
	this.log_7002 = "You must be tuned in to rate.";
	this.log_7003 = "Client-side error while submitting rating.  Please refresh your page and try again.";
	this.log_7004 = this.log_7003;
	this.log_7005 = this.log_7005;
	this.log_7006 = "You must have been recently tuned in to that song to rate it.";
	this.log_7007 = "You must wait to rate when switching between stations.";
	
	// Request Re-order Results
	this.log_8000 = "Server-side error while re-ordering.  Please try again.";
	this.log_8001 = "Client-side error while forming re-order request.  Please try again.";
	this.log_8002 = "One of your requests does not exist anymore.  Please try again.";
	
	// Login Results
	this.log_9000 = "Invalid username or password.";
	this.log_9001 = "Too many login attempts. Please go to the forums.";
	this.log_9002 = "Login error.  Please use the forums.";
	
	// 10000 is tune in hijacking
	
	/* Number suffixes */
	this.suffix_0 = "";
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
	
	this.pl_oncooldown = "<span class='pl_oncooldown'>On cooldown for <b>";
	this.pl_oncooldown2 = "</b>.</span>";
	this.pl_ranks = "Ranks <b>";
	this.pl_ranks2 = "</b> in globals ratings.";
	this.pl_favourited = "Favourited by <b>";
	this.pl_favourited2 = "</b>";
	this.pl_favourited3 = ".";
	this.pl_wins = "Has won <b>";
	this.pl_wins2 = "%</b> of the elections it's in, ranking <b>";
	this.pl_wins3 = "</b>.";
	this.pl_requested = "Has been requested <b>";
	this.pl_requested2 = "</b> times, ranking <b>";
	this.pl_requested3 = "</b>.";
	this.pl_genre = "Cooldown group: ";
	this.pl_genre2 = ".";
	this.pl_genres = "Cooldown groups: ";
	this.pl_genres2 = ".";
	
	/* Preferences */
	
	this.pref_refreshrequired = "(refresh required)";
	this.pref_timeline = "Timeline";
	this.pref_timeline_linear = "Linear Timeline";
	this.pref_timeline_showhistory = "Show History";
	this.pref_timeline_showelec = "Show Election Results";
	this.pref_playlist_disablesearch = "Disable Search";
	this.pref_timeline_showallnext = "Show All Upcoming Events";
	this.pref_rating_hidesite = "Hide Site Ratings Until I've Rated";
	this.pref_edi = "General";
	this.pref_edi_wipeall = "Erase Preferences";
	this.pref_edi_language = "Language";
	this.pref_edi_theme = "Skin";
	this.pref_fx = "Effects";
	this.pref_fx_fps = "Animation Framerate";
	this.pref_fx_enabled = "Animation Enabled";
	this.pref_logo_flash = "Flash Player";
	this.pref_mpi_showlog = "Show Log Panel";
	this.pref_requests = "Requests";
	this.pref_requests_technicalhint = "Technical Tab Title";
	this.pref_timeline_highlightrequests = "Highlight Requests";
	this.pref_timeline_fittonow = "Align To Now Playing";
	
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
	this.welcomefinish = "That's the Basics!";
	this.welcomefinish_p = "Enjoy Rainwave!<br /><br />Click Help for more, or drop by the chat.";
	this.about = "About / Donations / API";
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
	this.ratecurrentsong_p = "Slide your mouse over the graph, and then click.<br /><br />You can only rate the currently playing song and album, and songs in Previously Played that you've heard.";
	this.ratecurrentsong_t = "Rating affects how often songs and albums are played.<br /><br />Learn how to rate.";
	this.ratecurrentsong_tp = "Rating";
	this.setfavourite = "Favourites";
	this.setfavourite_p = "Click the box to set, or unset, your favourites.";
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
	this.showlist = "Live Show List";
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
	this.OVERTIME = "Overtime";
	
	// Requests
	this.requestsubmittedfor = "Request submitted for";
	this.requestok = "Requested";
	this.expiring = "Expiring!";
	this.soon = "Soon";
	this.shortwait = "Short Wait";
	this.wait = "Waiting";
	this.longwait = "Long Wait";
	this.reqoncooldown = "On Cooldown";
	this.reqempty = "Empty";
	
	/* Others */
	this.nowplaying = "Now Playing";
	this.requestedby = "Requested by";
	this.oncooldown = "On cooldown for";
	this.conflictedwith = "Conflicted with request by";
	this.conflictswith = "Conflicts with request by";
	this.election = "Election";
	this.previouslyplayed = "Previously Played";
	this.vote = "Vote";
	this.votes = "Votes";
	this.votelockingin = "Vote locking in";
	this.voted = "Voted";
	this.selectstation = "Select Station";
	this.tunedin = "Tuned In";
	this.tunedout = "Tuned Out";
	this.tunedoutm3u = "Tuned Out - Download M3U";
	this.play = "&#9654; Play In Browser";
	this.user = "User";
	this.player = "Player";
	this.help = "Help";
	this.options = "Options";
	this.forums = "Forums";
	this.jingle = "Jingle";
	this.liveshow = "Live Show";
	this.adset = "Advertisement";
	this.onetimeplay = "One-Time Play";
	this.deleteonetime = "Delete One-Time Play";
	this.currentdj = "dj";
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
	
	/* Words */
	
	this.and = "and";
	this.person = "person";
	this.person_p = "people";
	this['with'] = "with";
	this.or = "or";
	this.from = "from";
	
	/* Station descriptions */
	this.station_rainwave = "Original video game soundtracks.";
	this.station_ocremix = "100% OverClocked Remix.";
	this.station_mixwave = "Independant game cover bands and remixes.";
};
