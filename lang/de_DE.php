<?php
// Rainwave 3 de_DE Language File by DarkLink


$lang2 = array(
	// Panel Names
	"p_MainMPI" => "Tabs",
	"p_MenuPanel" => "Menü",
	"p_PlaylistPanel" => "Wiedergabeliste",
	"p_PrefsPanel" => "Einstellungen",
	"p_SchedulePanel" => "Terminplan",
	"p_NowPanel" => "Jetzt läuft",
	"p_RequestsPanel" => "Wünsche",
	"p_TimelinePanel" => "Zeitlinie",
	
	// This will produce dates like 5d 23h 10m 46s.  Change to your liking.
	"timeformat_d" => "d ",
	"timeformat_h" => "h ",
	"timeformat_m" => "m ",
	"timeformat_s" => "s ",
	
	// Edi Codes
	"log_1" => "Keine Sender ID von der API erhalten.",
	"log_2" => "Dieser Sender ist gerade wegen technischer Probleme nicht verfügbar.",
	"log_3" => "Bitte warte um |currentlyon| nutzen zu können.",
	
	// HTTP Codes
	"log_200" => "HTTP OK",
	"log_300" => "HTTP Redirected",
	"log_301" => "HTTP Moved",
	"log_307" => "HTTP Redirected",
	"log_400" => "HTTP Bad Request",
	"log_401" => "HTTP Unauthorized",
	"log_403_anon" => "Jemand anderes benutzt gerade Rainwave von deiner IP Adresse. Bitte Registriere dich, um das Problem zu beheben.",
	"log_403_reg" => "API Authentifikations Fehler - Bitte aktualisiere die Seite.",
	"log_404" => "HTTP Seite nicht gefunden",
	"log_408" => "HTTP Zeitüberschreitung",
	"log_500" => "Technische Probleme - Bitte versuch es noch einmal oder berichte einen Bug.",
	"log_502" => "Technische Probleme - Bitte warten.",
	"log_503" => "Rainwave hat gerade sehr viele Anfragen, bitte versuch es später erneut.",
	
	// Lyre-AJAX Codes
	"log_1000" => "Ups! Du hast einen Bug gefunden!",
	"log_1001" => "Fehlerhafte JSON-Antwort vom Server.",
	
	// Election Codes
	"log_2000" => "Serverseitiger Fehler während der Stimmübermittlung.",
	"log_2001" => "Du musst den Sender hören um abstimmen zu dürfen.",
	"log_2002" => "Ungültige Kandidaten ID",
	"log_2003" => "Du hast deine Stimme bereits abgegeben.",
	"log_2004" => "Du musst warten bevor du deine Stimme nach dem Senderwechsel abgeben kannst.",
	"log_2005" => "Diesen Kandidaten gibt es nicht.",
	"log_2006" => "Die Abstimmung ist bereits beendet.",
	"log_2007" => "Für diese Abstimmung kannst du deine Stimme noch nicht abgeben.",
	"log_2008" => "Du musst auf dem Sender abstimmen, den du gerade hörst.",
	
	// Request New Codes
	"log_3000" => "Serverseitiger Fehler während der Übertragung deiner Anfrage. Bitte versuch es noch einmal.",
	"log_3001" => "Du musst angemeldet sein, um dir etwas zu Wünschen.",
	"log_3002" => "Du musst den Sender hören, um dir etwas zu Wünschen.",
	"log_3003" => "Ungültige Song ID übermittelt.",
	"log_3004" => "Nicht verfügbaren Song gewünscht.",
	"log_3005" => "Du kannst nur auf dem Sender wünschen, den du gerade hörst.",
	"log_3006" => "Deine Wunschliste ist voll.",
	"log_3007" => "Diesen Song hast du dir schon gewünscht.",
	"log_3008" => "Von diesem Album hast du dir schon etwas gewünscht.",
	
	// Request Delete Results
	"log_4000" => "Serverseitiger Fehler beim löschen deines Wunsches. Bitte versuch es noch einmal.",
	"log_4001" => "Du musst angemeldet sein, um deine Wünsche zu ändern.",
	"log_4002" => "Clientseitiger Fehler beim übermitteln deiner Änderung. Bitte aktualisiere die Seite und versuch es noch einmal.",
	"log_4003" => "Dieser Wunsch gehört nicht dir.",
	
	// Request Change Results
	"log_6000" => "Serverseitiger Fehler beim ändern deines Wunsches. Bitte versuch es noch einmal.",
	"log_6001" => "Du musst angemeldet sein, um deine Wünsche zu verwalten.",
	"log_6002" => "Clientseitiger Fehler beim übermitteln deiner Änderung. Bitte aktualisiere die Seite und versuch es noch einmal.",
	"log_6003" => "Clientseitiger Fehler beim übermitteln deiner Änderung. Bitte aktualisiere die Seite und versuch es noch einmal, oder probiere einen anderen Song",
	"log_6004" => "Dieser Wunsch gehört nicht dir.",
	"log_6005" => "Du hast dir einen Song gewünscht, den es nicht gibt.",
	"log_6006" => "Du kannst dir nur Songs von dem Sender wünschen, den du gerade hörst.",
	"log_6007" => "Diesen Song hast du dir schon gewünscht.",
	"log_6008" => "Von diesem Album hast du dir schon etwas gewünscht.",
	
	// Rating Results
	"log_7000" => "Serverseitiger Fehler während der Übertragung deiner Wertung. Bitte versuch es noch einmal.",
	"log_7001" => "Du musst angemeldet sein, zum Bewerten.",
	"log_7002" => "Du musst den Sender hören um zu bewerten.",
	"log_7003" => "Clientseitiger Fehler beim übermitteln deiner Wertung. Bitte versuch es noch einmal.",
	"log_7004" => "Clientseitiger Fehler beim übermitteln deiner Wertung. Bitte versuch es noch einmal.",
	"log_7005" => "Clientseitiger Fehler beim übermitteln deiner Wertung. Bitte versuch es noch einmal.",
	"log_7006" => "Du musstest vor kurzem den Sender gehört haben um diesen Song bewerten zu dürfen.",
	"log_7007" => "Du musst warten bevor du deine Wertung nach dem Senderwechsel abgeben kannst.",
	
	// Request Re-order Results
	"log_8000" => "Serverseitiger Fehler während der Umsortierung. Bitte versuch es noch einmal.",
	"log_8001" => "Clientseitiger Fehler während der Sortierungsanfrage. Bitte versuch es noch einmal.",
	"log_8002" => "Du hast keine Wünsche zum umsortieren.",
	"log_8003" => "Einer deiner Wünsche wurde erfüllt. Bitte versuch es noch einmal.",
	
	// Login Results
	"log_9000" => "Falscher Benutzername oder Passwort.",
	"log_9001" => "Zu viele Login versuche. Bitte geh ins Forum.",
	"log_9002" => "Login Fehler. Bitte benutze das Forum.",
	
	// 10000 is used by error control for news
	
	// Suffixes may not be displayed in german
	"suffix_0" => "",
	"suffix_1" => "",
	"suffix_2" => "",
	"suffix_3" => "",
	"suffix_4" => "",
	"suffix_5" => "",
	"suffix_6" => "",
	"suffix_7" => "",
	"suffix_8" => "",
	"suffix_9" => "",
	"suffix_11" => "",
	"suffix_12" => "",
	"suffix_13" => "",
	
	// Playlist Sentences, these all show up in the album detail pages.
	
	"pl_oncooldown" => "Am abkühlen für |time|.",
	"pl_ranks" => "Bewertet mit |rating|, auf Rang |rank|.",
	"pl_favourited" => "Favorisiert von |count| |P:count,person|.",
	"pl_wins" => "Gewinnt |percent|% der Abstimmungen.",
	"pl_requested" => "Wurde |count| mal gewünscht, ist damit auf Platz |rank|.",
	"pl_genre" => "Abkühlgruppe: ",
	"pl_genre2" => ".",
	"pl_genres" => "Abkühlgruppen: ",
	"pl_genres2_normal" => ".",
	"pl_genres2_more" => " & weitere.",
	
	// Preference names
	
	"pref_refreshrequired" => "(Seite muss neu geladen werden)",
	"pref_timeline" => "Zeitlinie",
	"pref_timeline_linear" => "Lineare Zeitlinie",
	"pref_timeline_showhistory" => "Zeige Vergangenheit",
	"pref_timeline_showelec" => "Zeige Abstimmungsergebnisse an",
	"pref_timeline_showallnext" => "Zeige kommende Abstimungen an",
	"pref_rating_hidesite" => "Verstecke Wertungen bis ich gewertet habe",
	"pref_edi" => "Allgemein",
	"pref_edi_wipeall" => "Einstellungen löschen",
	"pref_edi_wipeall_button" => "Löschen",
	"pref_edi_language" => "Sprache",
	"pref_edi_theme" => "Skin",
	"pref_edi_resetlayout" => "Layout Zurücksetzen",
	"pref_edi_resetlayout_button" => "Zurücksetzen",
	"pref_fx" => "Effekte",
	"pref_fx_fps" => "Animationsgeschwindigkeit",
	"pref_fx_enabled" => "Animationen aktivieren",
	"pref_requests" => "Wünsche",
	"pref_requests_technicalhint" => "Zeige technischen Tab Titel",
	"pref_timeline_highlightrequests" => "Hebe Wünsche hervor",
	
	// About screen
	
	"creator" => "Ersteller",
	"rainwavemanagers" => "Rainwave Mitarbeiter",
	"ocrmanagers" => "OCR Radio Mitarbeiter",
	"mixwavemanagers" => "Mixwave Mitarbeiter",
	"jfinalfunkjob" => "Math Madman",
	"relayadmins" => "Relay Donors",
	"specialthanks" => "Danke geht an",
	"poweredby" => "Unterstützt von",
	"customsoftware" => "Custom 'Orpheus' software",
	"donationinformation" => "Spendenkonto und Informationen.",
	"apiinformation" => "API Dokumentation.",
	"translators" => "Übersetzer",
	"rainwave3version" => "Rainwave 3 Version",
	"revision" => "Rev",
	
	// Help
	
	"helpstart" => "Start ▶ ",
	"helpnext" => "weiter ▶ ",
	"helplast" => "schließen ▶ ",
	"about" => "Über / Spenden",
	"about_p" => "Mitarbeiter, eingesetzte Technologien und Spendeninformationen.",
	"voting" => "Abstimmung",
	"voting_p" => "Jeder Song der gespielt wird ist Teil einer Abstimmung. Der Song mit den meisten Stimmen wird als nächstes gespielt.|br|Erfahre, wie man abstimmt.",
	"clickonsongtovote" => "Klicke auf einen Song um für ihn zu stimmen.",
	"clickonsongtovote_p" => "Nachdem du den Sender eingestellt hast, klicke auf einen Song.|br|Der Song mit den meisten Stimmen wird als nächstes gespielt.",
	"tunein" => "Reinhören",
	"tunein_p" => "Lade die M3U-Datei herunter und öffne sie mit einem Media-Player um den Sender zu hören.|br|VLC, Winamp, Foobar2000, oder fstream (Mac) werden empfohlen.",
	"login" => "Einloggen oder Registrieren",
	"login_p" => "Bitte logge dich ein.",
	"ratecurrentsong" => "Bewerten",
	"ratecurrentsong_p" => "Fahre mit der Maus über die Skala, klicke um den Song zu bewerten.|br|Die Albumwertung ist der Durchschnitt der Songwertungen.",
	"ratecurrentsong_t" => "Die Bewertung entscheidet, wie oft Songs und Alben gespielt werden.|br|Erfahre, wie man bewertet.",
	"ratecurrentsong_tp" => "Bewertung",
	"setfavourite" => "Favoriten",
	"setfavourite_p" => "Klicke auf die Box neben der Skala um den Song oder das Album deinen Favoriten hinzuzufügen, oder zu entfernen.",
	"playlistsearch" => "Wiedergabeliste durchsuchen",
	"playlistsearch_p" => "Wenn du die Wiedergabeliste geöffnet hast, kannst du einfach anfangen zu tippen um eine Suche zu starten.|br|Benutze deine Maus oder die Pfeiltasten zum navigieren.",
	"request" => "Wünsche",
	"request_p" => "Wünsche dir Songs um sie in eine Abstimmung zu holen.|br|Erfahre, wie du dir etwas wünschen kannst.",
	"openanalbum" => "Öffne ein Album",
	"openanalbum_p" => "Klick auf ein Album in der Widergabeliste.|br|Alben am Ende der Wiedergabeliste sind gerade am abkühlen und können nicht gewünscht werden.",
	"clicktorequest" => "Mach einen Wunsch",
	"clicktorequest_p" => "Klicke auf das R um dir einen Song zu wünschen.|br|Songs am Ende des Albums sind gerade am abkühlen und können nicht gewünscht werden.",
	"managingrequests" => "Wünsche sortieren",
	"managingrequests_p" => "Ordne deine Wünsche per Drag & Drop an, oder klicke auf X um sie von deiner Wunschliste zu entfernen.",
	"timetorequest" => "Wunschstatus",
	"timetorequest_p" => "Deinen Wunschstatus kannst du hier verfolgen.|br|Steht hier \"Ablaufend\" oder \"am abkühlen\", solltest du einen Anderen Song auf den ersten Platz deiner Wunschliste schieben.",
	
	// What happens when RW crashes
	
	"crashed" => "Rainwave ist abgestürzt.",
	"submiterror" => "Bitte kopiere den unten stehenden Text und stelle ihn im Forum ein, um beim beheben des Fehlers zu helfen:",
	"pleaserefresh" => "Bitte lade die Seite neu um Rainwave wieder benutzen zu können.",
	
	// Schedule Panel Administration Functions
	
	"newliveshow" => "Neue Live Show",
	"newliveexplanation" => "Zeit kann 0 (jetzt) sein oder eine Zeitangabe in UTC",
	"time" => "Zeit",
	"name" => "Name",
	"notes" => "Notizen",
	"user_id" => "Benutzer ID",
	"addshow" => "Show hinzufügen",
	"start" => "Start",
	"end" => "Ende",
	"delete" => "Löschen",
	"lengthinseconds" => "Länge in Sekunden",
	"djblock" => "DJ Block?",
	"djadmin" => "DJ Admin",
	"pausestation" => "Station pausieren",
	"endpause" => "Pause beenden",
	"getready" => "Bereit machen",
	"standby" => "Standby",
	"mixingok" => "Mischung an",
	"connect" => "Verbinden",
	"HOLD" => "WARTE",
	"onair" => "Live",
	"endnow" => "Show beenden",
	"wrapup" => "Nachbereitung",
	"dormant" => "Untätig",
	"OVERTIME" => "ÜBER DER ZEIT",
	
	// Schedule Panel user text.

	"noschedule" => "Diese Woche stehen keine Events an.",
	
	// Requests
	
	"requestok" => "Gewünscht",
	"reqexpiring" => " (Ablaufend!)",
	"reqfewminutes" => " (in wenigen Minuten)",
	"reqsoon" => " (bald)",
	"reqshortwait" => " (kurze wartezeit)",
	"reqwait" => " (warte)",
	"reqlongwait" => " (lange wartezeit)",
	"reqoncooldown" => " (am abkühlen)",
	"reqempty" => " (leer)",
	"reqwrongstation" => " (falscher Sender)",
	"reqtechtitlefull" => " (|station||position|. mit |requestcount|)",
	"reqtechtitlesimple" => " (|station||requestcount|)",
	"reqexpiresin" => " (Der Platz läuft ab in |expiretime|)",
	"reqexpiresnext" => " (Der Platz läuft nach dem nächsten Wunsch ab)",
	"reqnorequests" => "Keine Wünsche übermittelt",
	"reqmyrequests" => "Meine Wünsche",
	"reqrequestline" => "Warteschlange",
	"reqrequestlinelong" => "Zeige die ersten |showing| von |linesize| Benutzern in der Warteschlange",
	"reqruleblocked" => "Zur Zeit wegen Abstimmungsregeln gesperrt.",

	// Now Playing and Timeline panels

	"nowplaying" => "Gerade läuft",
	"remixdetails" => "Remix Details",
	"songhomepage" => "Song Homepage",
	"requestedby" => "Gewünscht von |requester|",
	"oncooldownfor" => "Am abkühlen für |cooldown|.",
	"conflictedwith" => "Überschneidung mit dem Wunsch von |requester|",
	"conflictswith" => "Überschneidungen mit den Wünschen von |requester|.",
	"election" => "Abstimmung",
	"previouslyplayed" => "Vor kurzem gespielt",
	"votes" => "|votes| |P:votes,Vote|",
	"votelockingin" => "Stimme wird eingeloggt in |timeleft|...",
	"submittingvote" => "Übertrage Stimme...",
	"voted" => "Abgestimmt",
	"liveshow" => "Live Show",
	"adset" => "Werbung",
	"onetimeplay" => "Einmalwiedergabe",
	"deleteonetime" => "Lösche Einmalwiedergabe",
	"currentdj" => "dj |username|",
	"electionresults" => "Abstimmungsergebnisse",
	"from" => "von |username|",
	
	// Menu Bar
	
	"selectstation" => "Wähle einen Sender",
	"tunedin" => "Tuned In",
	"tunedout" => "Tuned Out",
	"play" => "▶ Im Browser abspielen",
	"downloadm3u" => "▶ M3U Herunterladen",
	"players" => "Unterstützte Media-Player sind VLC, Winamp, Foobar2000, und fstream (Mac/iPhone).|br|Windows Media Player und iTunes werden nicht funktionieren.",
	"help" => "Hilfe",
	"forums" => "Forum",
	"login" => "Einloggen",
	"register" => "Registrieren",
	"username" => "Benutername",
	"password" => "Passwort",
	"autologin" => "Automatisch-einloggen",
	"compatplayers" => "Unterstützte Media-Player:",
	"chat" => "Chat",
	"playing" => "◼ Wiedergabe stoppen",
	"loading" => "Lade",
	"searching" => "Suche: ",
	"m3uhijack" => "|plugin| versucht den M3U download zu übernehmen.  Bitte klicke mit der rechten Maustaste und wähle 'Speichern unter'",
	"menu_morestations" => "Mehr ▼",
	"waitingforstatus" => "Warte auf Status",
	
	/* Words for pluralization */

	"person" => "Person",
	"person_p" => "Personen",
	"Vote" => "Stimme",
	"Vote_p" => "Stimmen",
);
?>