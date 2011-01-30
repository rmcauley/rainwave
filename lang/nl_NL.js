/* Rainwave 3 nl_NL Language File */
// |variables| are replaced by Rainwave's localization library
// |S:variable| means to suffix a number-variable using the suffixes you define here. i.e. 4th, 5th, 6th, etc.  Works only on 1-10 number scales, made for English.
// |P:variable,word| pluralizes a word (found in this file) based on variable.  Again made for English, it only uses the plural word for anything != 0 and > 1.

// Due to various levels of assinineness, please remember to save this file as UTF-8, and also remember you are not guaranteed to use HTML codes.
// I have selectively used HTML codes in only certain places - you are not guaranteed to land upon a translation line that will make use of them.

var lang = new function() {
	// Panel Names
	this.p_MainMPI = "Tabs";
	this.p_MenuPanel = "Menu";
	this.p_PlaylistPanel = "Speellijst";
	this.p_PrefsPanel = "Instellingen";
	this.p_SchedulePanel = "Rooster";
	this.p_NowPanel = "Huidge Nummer";
	this.p_RequestsPanel = "Verzoeken";
	this.p_TimelinePanel = "Tijdlijn";
	
	// This will produce dates like 5d 23h 10m 46s.  Change to your liking.
	this.timeformat_d = "d ";
	this.timeformat_h = "u ";
	this.timeformat_m = "m ";
	this.timeformat_s = "s ";

	// Raw Log Code
	this.log_0 = "Debug";
	
	// Edi Codes
	this.log_1 = "Zender ID not provided to API.";
	this.log_2 = "Deze zender is op dit moment offline.<br />Kijk op <a href=\"http://twitter.com/Rainwavecc\">twitter.com/Rainwavecc</a> of de chatroom voor de laatste updates.";
	this.log_3 = "U gebruikte |lockedto| in de afgelopen minuten; u moet wachten voordat u |currentlyon| kunt gebruiken.";
	
	// HTTP Codes
	this.log_200 = "HTTP OK";
	this.log_300 = "HTTP Door geschakeld";
	this.log_301 = "HTTP Verhuisd";
	this.log_307 = "HTTP Door geschakeld";
	this.log_400 = "HTTP Foute in verzoek";
	this.log_401 = "HTTP Onbevoegd";
	this.log_403 = "Machtiging error - herlaad de pagina alstublieft.";
	this.log_404 = "HTTP Niet gevonden";
	this.log_408 = "HTTP Time Out";
	this.log_500 = "Technische problemen - probeer het later opnieuw of meld deze fout.";
	this.log_502 = "Technische problemen - een moment geduld alstublieft.";
	this.log_503 = "Rainwave ondergaat nu zwaar verkeer, probeer het later opnieuw.";
	
	// Lyre-AJAX Codes
	this.log_1000 = "Oeps!  U heeft een bug gevonden.";
	this.log_1001 = "Foute JSON response van de server.";
	
	// Election Codes
	this.log_2000 = "Server fout met het verzenden van uw stem.";
	this.log_2001 = "You must be tuned in to vote.";
	this.log_2002 = "Ongeldige kandidaat ID.";
	this.log_2003 = "U heeft al gestemd in deze electie."
	this.log_2004 = "U moet wachten met stemmen wanneer u van zender veranderd.";
	this.log_2005 = "Kandidaat keuze bestaat niet.";
	this.log_2006 = "De electie is afgelopen.";
	this.log_2007 = "U kunt niet meer in deze electie stemmen.";
	this.log_2008 = "U kunt alleen stemmen voor de zender waar u naar luistert."
	
	// Request New Codes
	this.log_3000 = "Server fout met het verzenden van uw verzoek. Probeer het later opnieuw.";
	this.log_3001 = "U moet ingelogd zijn om te verzoeken.";
	this.log_3002 = "You must be tuned in to request.";
	this.log_3003 = "Ongeldig nummer ID gevraagd.";
	this.log_3004 = "Onbestaanbaar nummer gevraagd.";
	this.log_3005 = "U kunt alleen nummers verzoeken van de zender waar u naar luistert.";
	this.log_3006 = "Verzoek limiet bereikt.";
	this.log_3007 = "Nummer al verzocht.";
	this.log_3008 = "Album al verzocht.";
	
	// Request Delete Results
	this.log_4000 = "Server fout met het verwijderen van uw verzoek. Probeer het later opnieuw.";
	this.log_4001 = "U moet ingelogd zijn om uw verzoek te veranderen.";
	this.log_4002 = "Client fout met het versturen van uw verzoek. Herlaad de pagina en probeer het opnieuw.";
	this.log_4003 = "Dit is niet uw verzoek.";
	
	// Request Change Results
	this.log_6000 = "Server fout met het veranderen van uw verzoek. Probeer het opnieuw.";
	this.log_6001 = "U moet ingelogd zijn om nummers te kunnen verzoeken.";
	this.log_6002 = "Client fout met het versturen van uw verzoek. Herlaad de pagina en probeer het opnieuw.";
	this.log_6003 = "Client fout met het versturen van uw verzoek. Herlaad de pagina en probeer het opnieuw of probeer een ander nummer.";
	this.log_6004 = "Dit is niet uw verzoek.";
	this.log_6005 = "U verzocht een nummer dat niet bestaat.";
	this.log_6006 = "U kunt alleen een nummer verzoeken voor de zender waar u naar luistert."
	this.log_6007 = "U heeft dit nummer al verzocht.";
	this.log_6008 = "U heeft al een nummer uit dit album verzocht.";
	
	// Rating Results
	this.log_7000 = "Server fout met het versturen van uw beoordeling. Probeer het opnieuw.";
	this.log_7001 = "U moet ingelogd zijn om te kunnen beoordelen.";
	this.log_7002 = "You must be tuned in to rate.";
	this.log_7003 = "Client fout met het versturen van uw beoordeling. Herlaad de pagina en probeer het opnieuw.";
	this.log_7004 = this.log_7003;
	this.log_7005 = this.log_7003;
	this.log_7006 = "U moet dit nummer hebben gehoord om deze te kunnen beoordelen.";
	this.log_7007 = "U moet wachten met beoordelen wanneer u van zender veranderd.";
	
	// Request Re-order Results
	this.log_8000 = "Server fout met het ordeneren. Probeer het opnieuw.";
	this.log_8001 = "Client fout met het versturen van uw ordenering. Probeer het opnieuw.";
	this.log_8002 = "U heeft geen verzoeken om te ordeneren.";
	this.log_8003 = "Één van uw verzoeken is voldaan. Probeer het opnieuw.";
	
	// Login Results
	this.log_9000 = "Ongeldig gebruikersnaam of wachtwoord.";
	this.log_9001 = "Inlog pogingen limiet bereikt. Probeer het alstublieft op de forums.";
	this.log_9002 = "Inlog fout. Probeer het alstublieft op de forums.";
	
	// 10000 is used by error control for news
	
	/* Number suffixes */
	this.suffix_0 = "ste";
	this.suffix_1 = "ste";
	this.suffix_2 = "de";
	this.suffix_3 = "de";
	this.suffix_4 = "de";
	this.suffix_5 = "de";
	this.suffix_6 = "de";
	this.suffix_7 = "de";
	this.suffix_8 = "de";
	this.suffix_9 = "de";
	
	/* Playlist Sentences */
	
	this.pl_oncooldown = "<span class='pl_ad_oncooldown'>In cooldown fase voor <b>|time|</b>.</span>";
	this.pl_ranks = "Rank <b>|S:rank|</b>.";
	this.pl_favourited = "Gefavoriseerd door <b>|count|</b> |P:count,person|.";
	this.pl_wins = "Won met <b>|percent|%</b> van de stemmen, met rank <b>|S:rank|</b>.";
	this.pl_requested = "Verzocht <b>|count|</b> times, met rank <b>|S:rank|</b>.";
	this.pl_genre = "Cooldown groep: ";		// Due to the code structure I cannot combine these.
	this.pl_genre2 = ".";
	this.pl_genres = "Cooldown groepen: ";
	this.pl_genres2 = ".";
	
	/* Preferences */
	
	this.pref_refreshrequired = "(herlaad vereist)";
	this.pref_timeline = "Tijdlijn";
	this.pref_timeline_linear = "Lineaire Tijdlijn";
	this.pref_timeline_showhistory = "Toon Geschiedenis";
	this.pref_timeline_showelec = "Toon Electie Resultaten";
	this.pref_timeline_showallnext = "Toon Alle Aankomende Evenementen";
	this.pref_rating_hidesite = "Verberg Site Beoordelingen Totdat Ik Heb Beoordeeld";
	this.pref_edi = "Algemeen";
	this.pref_edi_wipeall = "Wis Instellingen";
	this.pref_edi_language = "Taal";
	this.pref_edi_theme = "Skin";
	this.pref_fx = "Effecten";
	this.pref_fx_fps = "Animatie Snelheid";
	this.pref_fx_enabled = "Gebruik Animaties";
	this.pref_mpi_showlog = "Toon Log Paneel";
	this.pref_requests = "Verzoeken";
	this.pref_requests_technicalhint = "Technische Paneel Titel";
	this.pref_timeline_highlightrequests = "Markeer Beoordelingen Aan";
	
	/* About */
	
	this.creator = "Maker";
	this.rainwavemanagers = "Rainwave Personeel";
	this.ocrmanagers = "OCR Radio Personeel";
	this.mixwavemanagers = "Mixwave Personeel";
	this.jfinalfunkjob = "Rekenwonder";
	this.relayadmins = "Relay Donors";
	this.specialthanks = "Met dank aan";
	this.poweredby = "Mogelijk gemaakt met";
	this.customsoftware = "Custom 'Orpheus' software";
	this.donationinformation = "Donatie lijst en informatie.";
	this.apiinformation = "API documentatie.";
	
	/* Help */
	
	this.helpstart = "Start &#9654; ";
	this.helpnext = "Volgende &#9654; ";
	this.helplast = "Sluit &#9654; ";
	this.about = "Over / Donaties";
	this.about_p = "Personeel, gebruikte technieken, en donatie informatie.";
	this.voting = "Stemmen";
	this.voting_p = "Elk gespeeld nummer is een deel van een electie. Het nummer met de meeste stemmen gaat door.<br /><br />Leer hoe u moet stemmen.";
	this.clickonsongtovote = "Klik op een nummer om te stemmen";
	this.clickonsongtovote_p = "Wanneer u meeluistert, klik op een nummer.<br /><br />Het nummer met de meeste stemmen wordt als volgende gespeeld.";
	this.tunein = "Luister mee";
	this.tunein_p = "Gebruik de ingebouwde Flash player om mee te luisteren.<br /><br />U kunt ook een M3U downloading door op één van de icoontjes te klikken.";
	this.login = "Login of Register";
	this.login_p = "Log alstublieft in.";
	this.ratecurrentsong = "Beoordelen";
	this.ratecurrentsong_p = "Ga met uw muisje over de grafiek en klik om het nummer te beoordelen.<br /><br />Album beoordeling wordt bepaald door de gemiddelde beoordelingen van uw nummers.";
	this.ratecurrentsong_t = "Gebaseerd op de beoordelingen wordt bepaald hoe vaak een nummer en album worden afgespeeld.<br /><br />Leer hoe u moet beoordelen.";
	this.ratecurrentsong_tp = "Beoordelen";
	this.setfavourite = "Favorieten";
	this.setfavourite_p = "Klik op de knop aan het einde van de beoordeling reep om een nummer bij uw favorieten toe te voegen of verwijden.";
	this.playlistsearch = "Speellijst Zoeken";
	this.playlistsearch_p = "Met de speellijst open, kunt u naar een album zoeken door simpelweg de naam in te typen.<br /><br />Gebruik de knoppen op uw muis om te navigeren.";
	this.request = "Verzoeken";
	this.request_p = "Door een nummer te verzoeken komt deze in een electie.<br /><br />Leer een nummer te verzoeken.";
	this.openanalbum = "Open een Album";
	this.openanalbum_p = "Klik een album in de speellijst paneel.<br /><br />Albums onderin van de speellijst zijn in cooldown fase, en kunnen dus niet worden verzocht.";
	this.clicktorequest = "Maak een Verzoek";
	this.clicktorequest_p = "Klik op de R knop om een nummer te verzoeken.<br /><br />Nummers ondering de lijst zijn in cooldown fase, en kunnen dus niet worden verzocht.";
	this.managingrequests = "Sleep Verzoeken";
	this.managingrequests_p = "Sleep een verzoek om deze te ordeneren, of klik op de X om deze te verwijderen.";
	this.timetorequest = "Verzoek Status";
	this.timetorequest_p = "Uw verzoek status is hier aangegeven.<br /><br />Als hier \"Verlopen\" of \"Cooldown\" wordt aangegeven, kunt u beter uw nummer #1 verzoek veranderen.";
	
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
	// alleen deze
	this.noschedule = "Niks gepland voor deze week.";
	
	// Requests
	this.requestok = "Verzocht";
	this.reqexpiring = " (verlopen!)";
	this.reqfewminutes = " (een paar minuten)";
	this.reqsoon = " (binnenkort)";
	this.reqshortwait = " (gauw)";
	this.reqwait = " (wachten)";
	this.reqlongwait = " (lang wachten)";
	this.reqoncooldown = " (in cooldown fase)";
	this.reqempty = " (leeg)";
	this.reqwrongstation = " (verkeerde zender)";
	this.reqtechtitlefull = " (|station||S:position| met |requestcount|)";
	this.reqtechtitlesimple = " (|station||requestcount|)";
	
	/* Others */
	this.nowplaying = "Huidige Nummer";
	this.requestedby = "Verzocht door |requester|";
	this.oncooldownfor = "In cooldown fase voor |cooldown|.";
	this.conflictedwith = "Geconflicteerd met een verzoek van |requester|";
	this.conflictswith = "Conflicteerd met een verzoek van |requester|.";
	this.election = "Electie";
	this.previouslyplayed = "Vorige Nummers";
	this.votes = "|votes| |P:votes,Vote|";
	this.votelockingin = "Stem wordt besloten in |timeleft|...";
	this.submittingvote = "Stem wordt verstuurd...";
	this.voted = "Gestemd";
	this.selectstation = "Selecteer Zender";
	this.tunedin = "Tuned In";
	this.tunedout = "Tuned Out";
	this.play = "&#9654; Speel In Browser";
	this.help = "Help";
	this.forums = "Forums";
	this.liveshow = "Live Show";
	this.adset = "Advertentie";
	this.onetimeplay = "Één Malig Afspeling";
	this.deleteonetime = "Delete Één Malig Afspeling";
	this.currentdj = "dj |username|";
	this.login = "Login";
	this.register = "Register";
	this.username = "Gebruikersnaam";
	this.password = "Wachtwoord";
	this.autologin = "Auto-Login";
	this.compatplayers = "Ondersteunde Spelers:";
	this.electionresults = "Electie Resultaten";
	this.chat = "Chat";
	this.playing = "&#9633; Stop Afspeling";
	this.loading = "Laden";
	this.searching = "Zoeken: ";
	this.m3uhijack = "|plugin| probeert de M3U bestand over te nemen. Klik alstublieft met uw rechter muisknop en kies 'Opslaan Als.''";
	this.menu_morestations = "Meer &#9660;"
	this.from = "van |username|";
	
	/* Words for pluralization */

	this.person = "persoon";
	this.person_p = "gebruikers";
	this.Vote = "Stem";
	this.Vote_p = "Stemmen";

};
