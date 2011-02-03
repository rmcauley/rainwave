/* Rainwave 3 fi_FI v2 Language File */
// |variables| are replaced by Rainwave's localization library
// |S:variable| means to suffix a number-variable using the suffixes you define here. i.e. 4th, 5th, 6th, etc.  Works only on 1-10 number scales, made for English.
// |P:variable,word| pluralizes a word (found in this file) based on variable.  Again made for English, it only uses the plural word for anything != 0 and > 1.

// Due to various levels of assinineness, please remember to save this file as UTF-8, and also remember you are not guaranteed to use HTML codes.
// I have selectively used HTML codes in only certain places - you are not guaranteed to land upon a translation line that will make use of them.

var lang = new function() {
	// Panel Names
	this.p_MainMPI = "Välilehdet";
	this.p_MenuPanel = "Valikko";
	this.p_PlaylistPanel = "Soittolista";
	this.p_PrefsPanel = "Asetukset";
	this.p_SchedulePanel = "Aikataulu";
	this.p_NowPanel = "Nyt soi";
	this.p_RequestsPanel = "Toiveet";
	this.p_TimelinePanel = "Aikajana";
	
	// This will produce dates like 5d 23h 10m 46s.  Change to your liking.
	this.timeformat_d = "d ";
	this.timeformat_h = "h ";
	this.timeformat_m = "m ";
	this.timeformat_s = "s ";

	// Raw Log Code
	this.log_0 = "Debug";
	
	// Edi Codes
	this.log_1 = "Asematunnusta ei välitetty ohjelmointirajapinnalle.";
	this.log_2 = "Tällä asemalla ei juuri nyt ole lähetystä.<br />Tarkista uusimmat tiedot osoitteesta <a href=\"http://twitter.com/Rainwavecc\">twitter.com/Rainwavecc</a> tai chatista.";
	this.log_3 = "You used |lockedto| in the last few minutes; you must wait to use |currentlyon|.";
	
	// HTTP Codes
	this.log_200 = "HTTP OK";
	this.log_300 = "HTTP Uudelleenohjattu";
	this.log_301 = "HTTP Siirretty";
	this.log_307 = "HTTP Uudelleenohjattu";
	this.log_400 = "HTTP Virheellinen pyyntö";
	this.log_401 = "HTTP Pääsy kielletty";
	this.log_403 = "Tunnistusvirhe - ole hyvä ja päivitä sivu.";
	this.log_404 = "HTTP Ei löytynyt";
	this.log_408 = "HTTP Aikaraja ylittyi";
	this.log_500 = "Teknisiä vaikeuksia - ole hyvä ja yritä uudelleen tai ilmoita virheestä.";
	this.log_502 = "Teknisiä vaikeuksia - ole hyvä ja odota.";
	this.log_503 = "Rainwave on suuren kuormituksen alla, ole hyvä ja yritä uudelleen.";
	
	// Lyre-AJAX Codes
	this.log_1000 = "Hups!  Löysit virheen!";
	this.log_1001 = "Virheellinen JSON-vastaus palvelimelta.";
	
	// Election Codes
	this.log_2000 = "Palvelinvirhe ääntä lähettäessä.";
	this.log_2001 = "Sinun täytyy kuunnella asemaa äänestääksesi.";
	this.log_2002 = "Virheellinen ehdokastunnus.";
	this.log_2003 = "Olet jo äänestänyt tässä äänestyksessä."
	this.log_2004 = "Sinun täytyy odottaa, ennen kuin voit äänestää asemanvaihdon yhteydessä.";
	this.log_2005 = "Ehdokasta ei ole olemassa.";
	this.log_2006 = "Äänestyksen tulos on jo ratkennut.";
	this.log_2007 = "Et voi äänestää kyseisessä äänestyksessä vielä.";
	this.log_2008 = "Sinun täytyy äänestää sillä asemalla jota kuuntelet."
	
	// Request New Codes
	this.log_3000 = "Palvelinvirhe toivetta lähettäessä.  Ole hyvä ja yritä uudelleen.";
	this.log_3001 = "Sinun täytyy olla sisäänkirjautuneena toivoaksesi kappaletta.";
	this.log_3002 = "Sinun täytyy kuunnella asemaa toivoaksesi kappaletta.";
	this.log_3003 = "Lähetetty kappaletunnus oli virheellinen.";
	this.log_3004 = "Toivottua kappaletta ei ole olemassa.";
	this.log_3005 = "Sinun täytyy toivoa kappaletta nykyiseltä asemalta.";
	this.log_3006 = "Toiveraja saavutettu.";
	this.log_3007 = "Kappaletta on jo toivottu.";
	this.log_3008 = "Albumia on jo toivottu.";
	
	// Request Delete Results
	this.log_4000 = "Palvelinvirhe toivetta poistaessa.  Ole hyvä ja yritä uudelleen.";
	this.log_4001 = "Sinun täytyy olla sisäänkirjauneena vaihtaaksesi toivetta.";
	this.log_4002 = "Asiakasvirhe muutosta lähettäessä.  Ole hyvä ja päivitä sivu ja yritä sitten uudelleen.";
	this.log_4003 = "Kyseinen toive ei ole sinun.";
	
	// Request Change Results
	this.log_6000 = "Palvelinvirhe toivetta muuttaessa.  Ole hyvä ja yritä uudelleen.";
	this.log_6001 = "Sinun täytyy olla sisäänkirjautuneena toivoaksesi kappaletta.";
	this.log_6002 = "Asiakasvirhe muutosta lähettäessä.  Ole hyvä ja päivitä sivu ja yritä sitten uudelleen.";
	this.log_6003 = "Asiakasvirhe muutosta lähettäessä.  Ole hyvä ja päivitä sivu ja yritä sitten uudelleen tai kokeile toista kappaletta.";
	this.log_6004 = "Kyseinen toive ei ole sinun.";
	this.log_6005 = "Toivottua kappaletta ei ole olemassa.";
	this.log_6006 = "Sinun täytyy toivoa kappaletta siltä asemalta, jota kuuntelet."
	this.log_6007 = "Olet jo toivonut kyseistä kappaletta.";
	this.log_6008 = "Olet jo toivonut kappaletta kyseiseltä albumilta.";
	
	// Rating Results
	this.log_7000 = "Palvelinvirhe arvostelua lähettäessä.  Ole hyvä ja yritä uudelleen.";
	this.log_7001 = "Sinun täytyy olla sisäänkirjautuneena arvostellaksesi kappaleita.";
	this.log_7002 = "Sinun täytyy kuunnella asemaa arvostellaksesi kappaleita.";
	this.log_7003 = "Asiakasvirhe arvostelua lähettäessä.  Ole hyvä ja päivitä sivu ja yritä sitten uudelleen.";
	this.log_7004 = this.log_7003;
	this.log_7005 = this.log_7003;
	this.log_7006 = "You must have been recently tuned in to that song to rate it.";
	this.log_7007 = "Sinun täytyy odottaa arvostellaksesi asemavaihdon yhteydessä.";
	
	// Request Re-order Results
	this.log_8000 = "Palvelinvirhe uudelleenjärjestäessä toiveita.  Ole hyvä ja yritä uudelleen.";
	this.log_8001 = "Asiakasvirhe muodostaessa uudelleenjärjestyspyyntöä.  Ole hyvä ja yritä uudelleen.";
	this.log_8002 = "Sinulla ei ole toiveita mitä järjestää uudelleen.";
	this.log_8003 = "Jokin toiveesi on täytetty.  Ole hyvä ja yritä uudelleen.";
	
	// Login Results
	this.log_9000 = "Virheellinen käyttäjänimi tai salasana.";
	this.log_9001 = "Liian monta sisäänkirjautumisyritystä. Ole hyvä ja mene keskustelufoorumille.";
	this.log_9002 = "Sisäänkirjautumisvirhe.  Ole hyvä, ja käytä keskutelufoorumia.";
	
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
	
	this.pl_oncooldown = "<span class='pl_oncooldown'>Jäähyllä <b>|time|</b> ajan.</span>";
	this.pl_ranks = "Sijalla <b>|rank|</b>.";
	this.pl_favourited = "<b>|count|</b> |P:count,person| on asettanut tämän suosikikseen.";
	this.pl_wins = "Voittanut <b>|percent|%</b> äänestyksistä, sijalla <b>|rank|</b>.";
	this.pl_requested = "Toivottu <b>|count|</b> kertaa, sijalla <b>|rank|</b>.";
	this.pl_genre = "Jäähyryhmä: ";		// Due to the code structure I cannot combine these.
	this.pl_genre2 = ".";
	this.pl_genres = "Jäähyryhmät: ";
	this.pl_genres2 = ".";
	
	/* Preferences */
	
	this.pref_refreshrequired = "(sivun päivitys vaaditaan)";
	this.pref_timeline = "Aikajana";
	this.pref_timeline_linear = "Lineaarinen aikajana";
	this.pref_timeline_showhistory = "Näytä historia";
	this.pref_timeline_showelec = "Näytä äänestyksen tulokset";
	this.pref_timeline_showallnext = "Näytä kaikki tulevat tapahtumat";
	this.pref_rating_hidesite = "Piilota sivuston arvostelut kunnes olen itse arvostellut";
	this.pref_edi = "Yleiset";
	this.pref_edi_wipeall = "Pyyhi asetukset";
	this.pref_edi_language = "Kieli";
	this.pref_edi_theme = "Ulkoasu";
	this.pref_fx = "Tehosteet";
	this.pref_fx_fps = "Animaatioiden kehysnopeus (fps)";
	this.pref_fx_enabled = "Animointi päällä";
	this.pref_mpi_showlog = "Näytä lokipaneeli";
	this.pref_requests = "Toiveet";
	this.pref_requests_technicalhint = "Technical Tab Title";
	this.pref_timeline_highlightrequests = "Korosta toiveet";
	
	/* About */
	
	this.creator = "Tekijä";
	this.rainwavemanagers = "Rainwaven henkilökunta";
	this.ocrmanagers = "OCR Radion henkilökunta";
	this.mixwavemanagers = "Mixwaven henkilökunta";
	this.jfinalfunkjob = "Matematiikan ihmelapsi";
	this.relayadmins = "Välityspalvelinten lahjoittajat";
	this.specialthanks = "Kiitokset";
	this.poweredby = "Powered By";
	this.customsoftware = "Custom 'Orpheus' software";
	this.donationinformation = "Lista lahjoituksista ja lahjoitustietoa.";
	this.apiinformation = "Ohjelmointirajapinnan dokumentaatio.";
	
	/* Help */
	
	this.helpstart = "Aloita &#9654; ";
	this.helpnext = "Seuraava &#9654; ";
	this.helplast = "Sulje &#9654; ";
	this.about = "Yleistä / Lahjoitukset";
	this.about_p = "Henkilökunta, käytetty tekniikka ja lahjoitustietoa.";
	this.voting = "Äänestykset";
	this.voting_p = "Jokainen soitettu kappale on osa äänestystä. Se kappale, jolla on eniten ääniä soitetaan seuraavaksi.<br /><br />Opi äänestämään.";
	this.clickonsongtovote = "Napsauta kappaletta äänestääksesi";
	this.clickonsongtovote_p = "Kuunnellessasi asemaa, napsauta kappaletta.<br /><br />Eniten ääniä saanut kappale soitetaan seuraavaksi.";
	this.tunein = "Kuuntele";
	this.tunein_p = "Käytä selaimen sisäistä Flash-soitinta kuunnellaksesi asemaa.<br /><br />Voit myös imuroida M3U-soittolistatiedoston napsauttamalla musiikkisoittimesi kuvaketta.";
	this.login = "Kirjaudu sisään tai rekisteröidy";
	this.login_p = "Ole hyvä ja kirjaudu sisään.";
	this.ratecurrentsong = "Arvostelut";
	this.ratecurrentsong_p = "Liu'uta hiirtäsi asteikon päällä ja napsauta arvostellaksesi kappaleen.<br /><br />Albumiarvostelut lasketaan kappalearvioidesi keskiarvosta.";
	this.ratecurrentsong_t = "Arvosteleminen vaikuttaa kappaleiden ja albumien soittotiheyteen.<br /><br />Opi arvostelemaan.";
	this.ratecurrentsong_tp = "Arvostelu";
	this.setfavourite = "Suosikit";
	this.setfavourite_p = "Napsauta laatikkoa arviointiasteikon päässä asettaaksesi tai poistaaksesi suosikkisi.";
	this.playlistsearch = "Soittolistalta hakeminen";
	this.playlistsearch_p = "Kun soittolista on avoinna, voit aloittaa soittolistahaun alkamalla kirjoittamaan.<br /><br />Käytä hiirtäsi tai ylös-/alas-näppäintä ohjataksesi.";
	this.request = "Toiveet";
	this.request_p = "Toivominen saattaa haluamasi kappaleet äänestykseen.<br /><br />Opi toivomaan kappaleita.";
	this.openanalbum = "Avaa jokin albumi";
	this.openanalbum_p = "Napsauta albumia soittolistapaneelissa.<br /><br />Soittolistan pohjalla olevat albumit ovat jäähyllä, joten niitä ei voi toivoa.";
	this.clicktorequest = "Toivo kappaletta";
	this.clicktorequest_p = "Napsauta R-nappia tehdäksesi toiveen.<br /><br />Albumin pohjalla olevat kappaleet ovat jäähyllä, joten niitä ei voi toivoa.";
	this.managingrequests = "Toiveiden raahaus ja pudotus";
	this.managingrequests_p = "Raahaa ja pudota muuttaaksesi toiveidesi järjestystä, tai napsauta X:ää poistaaksesi yhden niistä.";
	this.timetorequest = "Kappaletoiveen tila";
	this.timetorequest_p = "Toiveesi tila näytetään tässä.<br /><br /> Jos se näyttää \"Umpeutumassa\" tai \"Jäähyllä\", sinun kannattaa vaihtaa ensimmäistä toivettasi.";
	
	/* Schedule Panel */
	
	this.newliveshow = "Uusi suora lähetys";
	this.newliveexplanation = "Aika voi olla 0 (nyt) tai epoch-aika UTC-aikavyöhykkeen mukaan.";
	this.time = "Aika";
	this.name = "Nimi";
	this.notes = "Muistiinpanot";
	this.user_id = "Käyttäjätunnus";
	this.addshow = "Lisää lähetys";
	this.start = "Aloita";
	this.end = "Lopeta";
	this['delete'] = "Poista";
	this.lengthinseconds = "Pituus sekunneissa";
	this.djblock = "DJ Block?";
	this.djadmin = "DJ Admin";
	this.pausestation = "Tauota asema";
	this.endpause = "Lopeta tauko";
	this.getready = "Valmistaudu";
	this.standby = "Valmiustila";
	this.mixingok = "Miksaus päällä";
	this.connect = "Yhdistä";
	this.HOLD = "ODOTA";
	this.onair = "Suora";
	this.endnow = "Lopeta lähetys";
	this.wrapup = "Päätä lähetys";
	this.dormant = "Toimeton";
	this.OVERTIME = "YLIAIKA";
	this.noschedule = "Tälle viikolle ei ole suunniteltu tapahtumia.";
	
	// Requests
	this.requestok = "Toivottu";
	this.reqexpiring = " (umpeutumassa!)";
	this.reqfewminutes = " (muutama minuutti)";
	this.reqsoon = " (pian)";
	this.reqshortwait = " (lyhyt odotus)";
	this.reqwait = " (odotus)";
	this.reqlongwait = " (pitkä odotus)";
	this.reqoncooldown = " (jäähyllä)";
	this.reqempty = " (tyhjä)";
	this.reqwrongstation = " (väärä asema)";
	this.reqtechtitlefull = " (|station||S:position| with |requestcount|)";
	this.reqtechtitlesimple = " (|requestcount|)";
	
	/* Others */
	this.nowplaying = "Nyt soi";
	this.requestedby = "Toivoja: |requester|.";
	this.oncooldownfor = "Jäähyllä |cooldown| ajan.";
	this.conflictedwith = "Oli ristiriidassa toiveen kanssa, jonka teki |requester|.";
	this.conflictswith = "Ristiriidassa toiveen kanssa, jonka teki |requester|.";
	this.election = "Äänestys";
	this.previouslyplayed = "Aiemmin soinut";
	this.votes = "|votes| |P:votes,Vote|";
	this.votelockingin = "Äänen lukitukseen |timeleft|...";
	this.submittingvote = "Lähetetään ääntä...";
	this.voted = "Äänestetty";
	this.selectstation = "Valitse asema";
	this.tunedin = "Tuned In";
	this.tunedout = "Tuned Out";
	this.play = "&#9654; Soita selaimessa";
	this.help = "Apua";
	this.forums = "Foorumi";
	this.liveshow = "Suora lähetys";
	this.adset = "Mainos";
	this.onetimeplay = "One-Time Play";
	this.deleteonetime = "Delete One-Time Play";
	this.currentdj = "dj |username|";
	this.login = "Kirjaudu sisään";
	this.register = "Rekisteröidy";
	this.username = "Käyttäjänimi";
	this.password = "Salasana";
	this.autologin = "Automaattinen sisäänkirjautuminen";
	this.compatplayers = "Tuetut soittimet:";
	this.electionresults = "Äänestyksen tulokset";
	this.chat = "Chat";
	this.playing = "&#9633; Pysäytä soitto";
	this.loading = "Ladataan";
	this.searching = "Etsitään: ";
	this.m3uhijack = "|plugin| yrittää kaapata M3U-soittolistan latauksen.  Ole hyvä ja napsauta oikealla hiiren painikkeella ja valitse 'Tallenna nimellä.'";
	this.menu_morestations = "Lisää &#9660;"
	this.from = "käyttäjältä |username|";
	
	/* Words for pluralization */

	this.person = "henkilö";
	this.person_p = "henkilöä";
	this.Vote = "ääni";
	this.Vote_p = "ääntä";

};
