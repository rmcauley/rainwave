<?php
// Rainwave 3 fi_FI r7 (21 apr 2011) for (R3 r41) Language File by quarterlife

$lang2 = array(
	"_SITEDESCRIPTIONS" => array(
		// Rainwave's description as it appears to search engines.
		1 => "Videopelimusiikkia soittava internet-radio.  Äänestä haluamaasi kappaletta!",
		// OCR Radio's description as it appears to search engines.
		2 => "OverClocked Remix radio.  Äänestä haluamaasi remixiä!",
		// Mixwave's.
		3 => "Videopelimusiikkia soittavia coverbändejä ja remixejä.  Äänestä suosikkiesittäjääsi!"
	),

	// Panel Names, these show up in the tab titles
	"p_MainMPI" => "Välilehdet",
	"p_MenuPanel" => "Valikko",
	"p_PlaylistPanel" => "Soittolista",
	"p_PrefsPanel" => "Asetukset",
	"p_SchedulePanel" => "Aikataulu",
	"p_NowPanel" => "Nyt soi",
	"p_RequestsPanel" => "Toiveet",
	"p_TimelinePanel" => "Aikajana",
	
	// These are used for cooldown times, e.g. 5d 23h 10m 46s.  Change to your liking.
	"timeformat_d" => "d ",
	"timeformat_h" => "h ",
	"timeformat_m" => "m ",
	"timeformat_s" => "s ",

	// Edi error codes
	"log_1" => "Asematunnusta ei välitetty API:lle.",
	"log_2" => "Tällä asemalla ei juuri nyt ole lähetystä teknisten vaikeuksien vuoksi.",
	"log_3" => "Ole hyvä ja odota käyttääksesi |currentlyon|.",	
	
	// HTTP error codes
	"log_200" => "HTTP OK",
	"log_300" => "HTTP Uudelleenohjattu",
	"log_301" => "HTTP Siirretty",
	"log_307" => "HTTP Uudelleenohjattu",
	"log_400" => "HTTP Virheellinen pyyntö",
	"log_401" => "HTTP Pääsy kielletty",
	"log_403_anon" => "Joku muu käyttää Rainwavea samasta IP-osoitteesta kuin sinä.  Ole hyvä ja rekisteröidy ratkaistaksesi tämän ongelman.",
	"log_403_reg" => "API tunnistusvirhe - ole hyvä ja päivitä sivu.",
	"log_404" => "HTTP Ei löytynyt",
	"log_408" => "HTTP Aikaraja ylittyi",
	"log_500" => "Teknisiä vaikeuksia - ole hyvä ja yritä uudelleen tai ilmoita virheestä.",
	"log_502" => "Teknisiä vaikeuksia - ole hyvä ja odota.",
	"log_503" => "Rainwave on suuren kuormituksen alla, ole hyvä ja yritä uudelleen.",
	
	// Lyre-AJAX Codes, these should NEVER show up...
	"log_1000" => "Hups!  Löysit virheen!",
	"log_1001" => "Virheellinen JSON-vastaus palvelimelta.",
	
	// Election Errors
	"log_2000" => "Palvelinvirhe ääntä lähettäessä.",
	"log_2001" => "Sinun täytyy kuunnella asemaa äänestääksesi.",
	"log_2002" => "Virheellinen ehdokastunnus.",
	"log_2003" => "Olet jo äänestänyt tässä äänestyksessä.",
	"log_2004" => "Sinun täytyy odottaa, ennen kuin voit äänestää asemanvaihdon yhteydessä.",
	"log_2005" => "Ehdokasta ei ole olemassa.",
	"log_2006" => "Äänestyksen tulos on jo ratkennut.",
	"log_2007" => "Et voi äänestää kyseisessä äänestyksessä vielä.",
	"log_2008" => "Sinun täytyy äänestää sillä asemalla jota kuuntelet.",
	
	// Making-a-Request Errors
	"log_3000" => "Palvelinvirhe toivetta lähettäessä.  Ole hyvä ja yritä uudelleen.",
	"log_3001" => "Sinun täytyy olla sisäänkirjautuneena toivoaksesi kappaletta.",
	"log_3002" => "Sinun täytyy kuunnella asemaa toivoaksesi kappaletta.",
	"log_3003" => "Lähetetty kappaletunnus oli virheellinen.",
	"log_3004" => "Toivottua kappaletta ei ole olemassa.",
	"log_3005" => "Sinun täytyy toivoa kappaletta nykyiseltä asemalta.",
	"log_3006" => "Toiveraja saavutettu.",
	"log_3007" => "Kappaletta on jo toivottu.",
	"log_3008" => "Albumia on jo toivottu.",
	
	// Request Deletion Errors
	"log_4000" => "Palvelinvirhe toivetta poistaessa.  Ole hyvä ja yritä uudelleen.",
	"log_4001" => "Sinun täytyy olla sisäänkirjauneena vaihtaaksesi toivetta.",
	"log_4002" => "Asiakasvirhe muutosta lähettäessä.  Ole hyvä ja päivitä sivu ja yritä sitten uudelleen.",
	"log_4003" => "Kyseinen toive ei ole sinun.",
	
	// Request Change Errors (swapping 1 request for another)
	"log_6000" => "Palvelinvirhe toivetta muuttaessa.  Ole hyvä ja yritä uudelleen.",
	"log_6001" => "Sinun täytyy olla sisäänkirjautuneena toivoaksesi kappaletta.",
	"log_6002" => "Asiakasvirhe muutosta lähettäessä.  Ole hyvä ja päivitä sivu ja yritä sitten uudelleen.",
	"log_6003" => "Asiakasvirhe muutosta lähettäessä.  Ole hyvä ja päivitä sivu ja yritä sitten uudelleen tai kokeile toista kappaletta.",
	"log_6004" => "Kyseinen toive ei ole sinun.",
	"log_6005" => "Toivottua kappaletta ei ole olemassa.",
	"log_6006" => "Sinun täytyy toivoa kappaletta siltä asemalta, jota kuuntelet.",
	"log_6007" => "Olet jo toivonut kyseistä kappaletta.",
	"log_6008" => "Olet jo toivonut kappaletta kyseiseltä albumilta.",
	
	// Rating Errors
	"log_7000" => "Palvelinvirhe arvostelua lähettäessä.  Ole hyvä ja yritä uudelleen.",
	"log_7001" => "Sinun täytyy olla sisäänkirjautuneena arvostellaksesi kappaleita.",
	"log_7002" => "Sinun täytyy kuunnella asemaa arvostellaksesi kappaleita.",
	"log_7003" => "Asiakasvirhe arvostelua lähettäessä.  Ole hyvä ja päivitä sivu ja yritä sitten uudelleen.",
	"log_7004" => "Asiakasvirhe arvostelua lähettäessä.  Ole hyvä ja päivitä sivu ja yritä sitten uudelleen.",
	"log_7005" => "Asiakasvirhe arvostelua lähettäessä.  Ole hyvä ja päivitä sivu ja yritä sitten uudelleen.",
	"log_7006" => "Sinun täytyy olla kuunnellut kyseistä kappaletta arvostellaksesi sen.",
	"log_7007" => "Sinun täytyy odottaa arvostellaksesi asemavaihdon yhteydessä.",
	
	// Request Re-order Errors
	"log_8000" => "Palvelinvirhe uudelleenjärjestäessä toiveita.  Ole hyvä ja yritä uudelleen.",
	"log_8001" => "Asiakasvirhe muodostaessa uudelleenjärjestyspyyntöä.  Ole hyvä ja yritä uudelleen.",
	"log_8002" => "Sinulla ei ole toiveita mitä järjestää uudelleen.",
	"log_8003" => "Jokin toiveesi on täytetty.  Ole hyvä ja yritä uudelleen.",
	
	// Login Results
	"log_9000" => "Virheellinen käyttäjänimi tai salasana.",
	"log_9001" => "Liian monta sisäänkirjautumisyritystä. Ole hyvä ja mene keskustelufoorumeille.",
	"log_9002" => "Sisäänkirjautumisvirhe.  Ole hyvä, ja käytä keskutelufoorumeita.",
	
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

	// Playlist Sentences, these all show up in the album detail pages.
	
	"pl_oncooldown" => "Jäähyllä |time| ajan.",
	"pl_ranks" => "Arvosteltu |rating|, sijalla |rank|.",
	"pl_favourited" => "|count| |P:count,person| on asettanut tämän suosikikseen.",
	"pl_wins" => "Voittaa |percent|% äänestyksistä, joissa on mukana.",
	"pl_requested" => "Toivottu |count| kertaa, sijalla |rank|.",
	"pl_genre" => "Jäähyryhmä: ",
	"pl_genre2" => ".",
	"pl_genres" => "Jäähyryhmät: ",
	// If there's more than 3 cooldown groups across all songs in an album, Rainwave truncates the list and uses " & others."
	// So you'll see "Cooldown groups: foo, bar, baz, & others." if there's more than 3.  But if only 3 exist: "Cooldown groups: foo, bar, baz."
	"pl_genres2_normal" => ".",
	"pl_genres2_more" => " & muita.",
	
	// Preference names
	
	"pref_refreshrequired" => "(sivun päivitys vaaditaan)",
	"pref_timeline" => "Aikajana",
	"pref_timeline_linear" => "Lineaarinen aikajana",
	"pref_timeline_showhistory" => "Näytä historia",
	"pref_timeline_showelec" => "Näytä äänestyksen tulokset",
	"pref_timeline_showallnext" => "Näytä kaikki tulevat tapahtumat",
	"pref_rating_hidesite" => "Piilota sivuston arvostelut kunnes olen itse arvostellut",
	"pref_edi" => "Yleiset",
	"pref_edi_wipeall" => "Pyyhi asetukset",
	"pref_edi_wipeall_button" => "Pyyhi",
	"pref_edi_language" => "Kieli",
	"pref_edi_theme" => "Teema",
	"pref_edi_resetlayout" => "Nollaa ulkoasu",
	"pref_edi_resetlayout_button" => "Nollaa",
	"pref_fx" => "Tehosteet",
	"pref_fx_fps" => "Animaatioiden kehysnopeus",
	"pref_fx_enabled" => "Animointi päällä",
	"pref_requests" => "Toiveet",
	"pref_requests_technicalhint" => "Tekninen välilehden otsikko",
	"pref_timeline_highlightrequests" => "Näytä kappaleiden toivojat oletuksena",
	
	// About screen
	
	"creator" => "Luoja",
	"rainwavemanagers" => "Rainwaven henkilökunta",
	"ocrmanagers" => "OCR Radion henkilökunta",
	"mixwavemanagers" => "Mixwaven henkilökunta",
	"jfinalfunkjob" => "Matematiikan ihmelapsi",
	"relayadmins" => "Välityspalvelinten lahjoittajat",
	"specialthanks" => "Kiitokset",
	"poweredby" => "Käytetty tekniikka",
	"customsoftware" => "Omatekoinen 'Orpheus' ohjelma",
	"donationinformation" => "Lista lahjoituksista ja lahjoitustietoa.",
	"apiinformation" => "Ohjelmointirajapinnan dokumentaatio.",
	"translators" => "Kääntäjät",
	"rainwave3version" => "Rainwave 3 -versio",
	"revision" => "Rev",
	
	// Help
	// Careful, a lot of those funny blocks are there because Courier New doesn't have the UTF-8 arrow icons.
	// "blank" is a header
	// "blank_p" is an explanatory paragraph, part of a tutorial
	// "blank_t" is the short explanation of what tutorial follows when you click on the help box
	
	"helpstart" => "Aloita ▶ ",
	"helpnext" => "Seuraava ▶ ",
	"helplast" => "Sulje ▶ ",
	"about" => "Yleistä / Lahjoitukset",
	"about_p" => "Henkilökunta, käytetty tekniikka ja lahjoitustietoa.",
	"voting" => "Äänestäminen",
	"voting_p" => "Jokainen soitettu kappale on osa äänestystä. Se kappale, jolla on eniten ääniä soitetaan seuraavaksi.|br|Opi äänestämään.",
	"clickonsongtovote" => "Napsauta kappaletta äänestääksesi",
	"clickonsongtovote_p" => "Kuunnellessasi asemaa, napsauta kappaletta.|br|Eniten ääniä saanut kappale soitetaan seuraavaksi.",
	"tunein" => "Kuuntele",
	"tunein_p" => "Imuroi M3U-soittolista ja käytä mediasoitintasi kuuntelemiseen.|br|VLC, Winamp, Foobar2000 ja fstream (Mac) ovat suositeltuja.",
	"login_p" => "Ole hyvä ja kirjaudu sisään.",
	"ratecurrentsong" => "Arvosteleminen",
	"ratecurrentsong_p" => "Liu'uta hiirtäsi asteikon päällä ja napsauta arvostellaksesi kappaleen.|br|Albumiarvostelut lasketaan kappalearvioidesi keskiarvosta.",
	"ratecurrentsong_t" => "Arvosteleminen vaikuttaa kappaleiden ja albumien soittotiheyteen.|br|Opi arvostelemaan.",
	"setfavourite" => "Suosikit",
	"setfavourite_p" => "Napsauta laatikkoa arviointiasteikon päässä asettaaksesi tai poistaaksesi suosikkisi.",
	"playlistsearch" => "Soittolistalta hakeminen",
	"playlistsearch_p" => "Kun soittolista on avoinna, voit aloittaa soittolistahaun alkamalla kirjoittamaan.|br|Käytä hiirtäsi tai ylös-/alas-näppäintä ohjataksesi.",
	"request" => "Toiveet",
	"request_p" => "Toivominen saattaa haluamasi kappaleet äänestykseen.|br|Opi toivomaan kappaleita.",
	"openanalbum" => "Avaa jokin albumi",
	"openanalbum_p" => "Napsauta albumia soittolistapaneelissa.|br|Soittolistan pohjalla olevat albumit ovat jäähyllä, joten niitä ei voi toivoa.",
	"clicktorequest" => "Toivo kappaletta",
	"clicktorequest_p" => "Napsauta R-nappia tehdäksesi toiveen.|br|Albumin pohjalla olevat kappaleet ovat jäähyllä, joten niitä ei voi toivoa.",
	"managingrequests" => "Toiveiden raahaus ja pudotus",
	"managingrequests_p" => "Raahaa ja pudota muuttaaksesi toiveidesi järjestystä, tai napsauta X:ää poistaaksesi yhden niistä.",
	"timetorequest" => "Kappaletoiveen tila",
	"timetorequest_p" => "Toiveesi tila näytetään tässä.|br|Jos se näyttää \"umpeutumassa!\" tai \"jäähyllä\", sinun kannattaa vaihtaa ensimmäistä toivettasi.",

	// What happens when RW crashes
	
	"crashed" => "Rainwave kaatui.",
	"submiterror" => "Ole hyvä ja kopioi alla oleva teksti ja liitä se viestiin foorumeilla auttaaksesi virheen korjaamisessa:",
	"pleaserefresh" => "Päivitä sivu jatkaaksesi Rainwaven käyttöä.",
	
	// Schedule Panel Administration Functions, does not need to be translated.
	// AND YOU SAY THAT NOW????? -quarterlife
	
	"newliveshow" => "Uusi suora lähetys",
	"newliveexplanation" => "Aika voi olla 0 (nyt) tai epoch-aika UTC-aikavyöhykkeen mukaan.",
	"time" => "Aika",
	"name" => "Nimi",
	"notes" => "Muistiinpanot",
	"user_id" => "Käyttäjätunnus",
	"addshow" => "Lisää lähetys",
	"start" => "Aloita",
	"end" => "Lopeta",
	"delete" => "Poista",
	"lengthinseconds" => "Pituus sekunneissa",
	"djblock" => "DJ Block?",
	"djadmin" => "DJ Admin",
	"pausestation" => "Tauota asema",
	"endpause" => "Lopeta tauko",
	"getready" => "Valmistaudu",
	"standby" => "Valmiustila",
	"mixingok" => "Miksaus päällä",
	"connect" => "Yhdistä",
	"HOLD" => "ODOTA",
	"onair" => "Suora",
	"endnow" => "Lopeta lähetys",
	"wrapup" => "Päätä lähetys",
	"dormant" => "Toimeton",
	"OVERTIME" => "YLIAIKA",
	
	// Schedule Panel user text.
	
	"noschedule" => "Tälle viikolle ei ole suunniteltu tapahtumia.",
	
	// Requests
	
	"requestok" => "Toivottu",
	"reqexpiring" => " (umpeutumassa!)",
	"reqfewminutes" => " (muutama minuutti)",
	"reqsoon" => " (pian)",
	"reqshortwait" => " (lyhyt odotus)",
	"reqwait" => " (odotus)",
	"reqlongwait" => " (pitkä odotus)",
	"reqoncooldown" => " (jäähyllä)",
	"reqempty" => " (tyhjä)",
	"reqwrongstation" => " (väärä asema)",
	"reqtechtitlefull" => " (|station|sijalla |position|, toiveita |requestcount|)",
	"reqtechtitlesimple" => " (|station||requestcount|)",
	"reqexpiresin" => " (paikka jonossa umpeutuu ajassa |expiretime|)",
	"reqexpiresnext" => " (paikka jonossa umpeutuu seuraavan toiveen jälkeen)",
	"reqnorequests" => "Et ole toivonut mitään",
	"reqmyrequests" => "Minun toiveeni",
	"reqrequestline" => "Jono",
	"reqrequestlinelong" => "Jonon |showing| ensimmäistä, |linesize| jonossa.",
	"reqalbumblocked" => "Estetty; albumi on äänestyksessä.",
	"reqgroupblocked" => "Estetty; jäähyryhmä on äänestyksessä.",
	
	// Now Playing and Timeline panels
	
	"nowplaying" => "Nyt soi",
	"remixdetails" => "Tiedot Remixistä",
	"songhomepage" => "Kappaleen kotisivu",
	"requestedby" => "Kappaletta toivoi |requester|",
	"oncooldownfor" => "Jäähyllä |cooldown| ajan.",
	"conflictedwith" => "Oli ristiriidassa toiveen kanssa, jonka teki |requester|.",
	"conflictswith" => "Ristiriidassa toiveen kanssa, jonka teki |requester|.",
	"election" => "Äänestys",
	"previouslyplayed" => "Aiemmin soinut",
	"votes" => "|votes| |P:votes,Vote|",
	"votelockingin" => "Äänen lukitukseen |timeleft|...",
	"submittingvote" => "Lähetetään ääntä...",
	"voted" => "Äänestetty",
	"liveshow" => "Suora lähetys",
	"adset" => "Mainos",
	"onetimeplay" => "Kertasoitto",
	"deleteonetime" => "Poista kertasoitto",
	"currentdj" => "dj |username|",
	"electionresults" => "Äänestyksen tulokset",
	"from" => "käyttäjältä |username|",
	
	// Menu Bar
	
	"selectstation" => "Valitse asema",
	"tunedin" => "Kuuntelet asemaa",
	"tunedout" => "Et kuuntele asemaa",
	"play" => "▶ Soita selaimessa",
	"downloadm3u" => "▶ Lataa M3U",
	"players" => "Tuetut soittimet ovat VLC, Winamp, Foobar2000 ja fstream (Mac/iPhone).|br|Windows Media Player ja iTunes eivät toimi.",
	"help" => "Apua",
	"forums" => "Foorumit",
	"login" => "Kirjaudu sisään",
	"logout" => "Kirjaudu ulos",	
	"register" => "Rekisteröidy",
	"username" => "Käyttäjänimi",
	"password" => "Salasana",
	"autologin" => "Automaattinen sisäänkirjautuminen",
	"compatplayers" => "Tuetut soittimet:",
	"chat" => "Chat",
	"playing" => "◼ Pysäytä soitto",
	"loading" => "Ladataan",
	"searching" => "Etsitään: ",
	"m3uhijack" => "|plugin| yrittää kaapata M3U-soittolistan latauksen.  Ole hyvä ja napsauta oikealla hiiren painikkeella ja valitse 'Tallenna nimellä.'",
	"menu_morestations" => "Lisää ▼",
	"waitingforstatus" => "Odottaa tietoja",
	"managekeys" => "Manage API Keys",
	
	/* Words for pluralization */

	"person" => "henkilö",
	"person_p" => "henkilöä",
	"Vote" => "ääni",
	"Vote_p" => "ääntä"
);
?>