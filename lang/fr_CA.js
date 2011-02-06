/* Rainwave 3 en_CA Language File */
// |variables| are replaced by Rainwave's localization library
// |S:variable| means to suffix a number-variable using the suffixes you define here. i.e. 4th, 5th, 6th, etc. Works only on 1-10 number scales, made for English.
// |P:variable,word| pluralizes a word (found in this file) based on variable. Again made for English, it only uses the plural word for anything != 0 and > 1.

// Due to various levels of assinineness, please remember to save this file as UTF-8, and also remember you are not guaranteed to use HTML codes.
// I have selectively used HTML codes in only certain places - you are not guaranteed to land upon a translation line that will make use of them.

var lang = new function() {
// Panel Names
this.p_LogPanel = "Log";
this.p_MainMPI = "Onglets";
this.p_MenuPanel = "Menu";
this.p_PlaylistPanel = "Liste Musicale";
this.p_PrefsPanel = "Préférences";
this.p_SchedulePanel = "Horaire";
this.p_NowPanel = "Présentement";
this.p_RequestsPanel = "Demandes Spéciales";
this.p_TimelinePanel = "Chronologie";

// This will produce dates like 5d 23h 10m 46s. Change to your liking.
this.timeformat_d = "j ";
this.timeformat_h = "h ";
this.timeformat_m = "m ";
this.timeformat_s = "s ";

// Raw Log Code
this.log_0 = "Debug";

// Edi Codes
this.log_1 = "L'ID de la station n'a pas été donné au serveur Rainwave.";
this.log_2 = "Cette station est présentement hors ligne.<br />Vérifier <a href=\"http://twitter.com/Rainwavecc\">twitter.com/Rainwavecc</a> ou la chatroom pour des nouvelles.";
this.log_3 = "Vous avez utilisé |lockedto| dans les dernières minutes; vous devez attendre avant d'utiliser |currentlyon|.";

// HTTP Codes
this.log_200 = "HTTP OK";
this.log_300 = "HTTP Redirigé";
this.log_301 = "HTTP Déplacé";
this.log_307 = "HTTP Redirigé";
this.log_400 = "HTTP Mauvaise Demande Spéciale";
this.log_401 = "HTTP Non-autorisé";
this.log_403 = "Erreur d'autorisation - s.v.p., actualisez la page.";
this.log_404 = "HTTP Non Trouvé";
this.log_408 = "HTTP Time Out";
this.log_500 = "Difficultés Techniques - s.v.p., réessayez ou reportez le bug.";
this.log_502 = "Difficultés Techniques - s.v.p., patientez.";
this.log_503 = "Rainwave est présentement surchargé, s.v.p. réessayez.";

// Lyre-AJAX Codes
this.log_1000 = "Oops! Vous avez trouvé un bug!";
this.log_1001 = "Mauvaise réponse JSON du serveur.";

// Election Codes
this.log_2000 = "Erreur du serveur pendant le vote.";
this.log_2001 = "Vous devez être à l'écoute de la station pour voter.";
this.log_2002 = "ID du candidat invalide.";
this.log_2003 = "Vous avez déjà voté pour cette élection."
this.log_2004 = "Vous devez attendre pour voter lorsque vous changez de station.";
this.log_2005 = "L'entrée du candidat n'existe pas.";
this.log_2006 = "Cette élection à déjà été choisie.";
this.log_2007 = "Vous ne pouvez pas voter sur cette élection maintenant.";
this.log_2008 = "Vous devez voter à la station que vous écoutez."

// Request New Codes
this.log_3000 = "Erreur du serveur pendant que vous faisiez votre Demande Spéciale. S.v.p., réessayez.";
this.log_3001 = "Vous devez être connecté pour faire une Demande Spéciale.";
this.log_3002 = "Vous devez être à l'écoute de la station pour faire une Demande Spéciale.";
this.log_3003 = "ID de la chanson invalide.";
this.log_3004 = "La chanson demandée n'existe pas.";
this.log_3005 = "Vous devez faire la Demande Spéciale d'une chanson à la station que vous écoutez.";
this.log_3006 = "Limite de Demandes Spéciales atteinte.";
this.log_3007 = "Chanson déjà en Demande Spéciale.";
this.log_3008 = "Album déjà Demande Spéciale.";

// Request Delete Results
this.log_4000 = "Erreur du serveur lors de l'effacement de la Demande Spéciale. S.v.p., réessayez.";
this.log_4001 = "Vous devez être connecté pour changer la Demande Spéciale.";
this.log_4002 = "Erreur du client lors du changement. S.v.p., actualisez la page et réessayez.";
this.log_4003 = "Cette Demande Spéciale n'est pas la vôtre.";

// Request Change Results
this.log_6000 = "Erreur du serveur lors du changement de la Demande Spéciale. S.v.p., réessayez.";
this.log_6001 = "Vous devez être connecté pour utiliser les Demandes Spéciales.";
this.log_6002 = "Erreur du client lors du changement. S.v.p., actualisez la page et réessayez.";
this.log_6003 = "Erreur du client lors du changement. S.v.p., actualisez la page et réessayez, ou essayez une autre chanson.";
this.log_6004 = "Cette Demande Spéciale n'est pas la vôtre.";
this.log_6005 = "Vous avez fait la Demande Spéciale d'une chanson non-existante.";
this.log_6006 = "Vous devez faire la Demande Spéciale d'une chanson sur la station que vous écoutez."
this.log_6007 = "Vous avez déjà demandé cette chanson.";
this.log_6008 = "Vous avez déjà demandé une chanson de cet album.";

// Rating Results
this.log_7000 = "Erreur du serveur lors de l'évaluation. S.v.p., réessayez.";
this.log_7001 = "Vous devez être connecté pour évaluer.";
this.log_7002 = "Vous devez être à l'écoute de la station pour évaluer.";
this.log_7003 = "Erreur du client lors de l'évaluation. S.v.p., actualisez la page et réessayez.";
this.log_7004 = this.log_7003;
this.log_7005 = this.log_7003;
this.log_7006 = "Vous deviez être à l'écoute de la station pour évaluer cette chanson.";
this.log_7007 = "Vous devez attendre pour évaluer lorsque vous changez de station.";

// Request Re-order Results
this.log_8000 = "Erreur du serveur lors du réarrangement. S.v.p., réessayez.";
this.log_8001 = "Erreur du serveur lors du réarrangement. S.v.p., réessayez.";
this.log_8002 = "Une de vos Demandes Spéciales n'existe plus. S.v.p., réessayez.";
this.log_8002 = "Une de vos Demandes Spéciales s'est réalisée. S.v.p., réessayez.";
this.log_8003 = "Une de ses Demandes Spéciales n'est pas à vous.";

// Login Results
this.log_9000 = "Nom d'Utilisateur ou Mot de Passe invalide.";
this.log_9001 = "Trop de tentatives de connexion. S.v.p., allez sur les forums.";
this.log_9002 = "Erreur de connexion. S.v.p., utilisez les forums.";

// 10000 is used by error control for news

/* Number suffixes */
this.suffix_0 = "e";
this.suffix_1 = "er";
this.suffix_2 = "e";
this.suffix_3 = "e";
this.suffix_4 = "e";
this.suffix_5 = "e";
this.suffix_6 = "e";
this.suffix_7 = "e";
this.suffix_8 = "e";
this.suffix_9 = "e";

/* Playlist Sentences */

this.pl_oncooldown = "<span class='pl_oncooldown'>En temps de recharge pour |time|.<b>";
this.pl_ranks = "Rangs <b>|S:rank|</b>.";
this.pl_favourited = "Favoris par <b>|count|</b> |P:count,person|.";
this.pl_wins = "A gagné <b>|percent|%</b> de ses élections, <b>|S:rank|</b> au classement.";
this.pl_requested = "Demandé <b>|count|</b> fois, <b>|S:rank|</b> au classement.";
this.pl_genre = "Groupe de recharge: "; // Due to the code structure I cannot combine these.
this.pl_genre2 = ".";
this.pl_genres = "Groupe de recharge: ";
this.pl_genres2 = ".";

/* Preferences */

this.pref_refreshrequired = "(Actualisez la page)";
this.pref_timeline = "Chronologie";
this.pref_timeline_linear = "Chronologie linéaire";
this.pref_timeline_showhistory = "Afficher l'Historique";
this.pref_timeline_showelec = "Afficher les Résultats des Élections";
this.pref_timeline_showallnext = "Afficher tous les Évenements à venir";
this.pref_rating_hidesite = "Cacher les Évaluations Générales avant mes Évaluations";
this.pref_edi = "Général";
this.pref_edi_wipeall = "Éffacer Mes Préférences";
this.pref_edi_language = "Langue";
this.pref_edi_theme = "Thème";
this.pref_fx = "Effets";
this.pref_fx_fps = "Animation Frame Rate";
this.pref_fx_enabled = "Activer les Animations";
this.pref_mpi_showlog = "Afficher le Panneau du Registre";
this.pref_requests = "Demandes Spéciales";
this.pref_requests_technicalhint = "Titre Technique de l'Onglet";
this.pref_timeline_highlightrequests = "Surlinger les Demandes Spéciales";

/* About */

this.creator = "Créateur";
this.rainwavemanagers = "Équipe Rainwave";
this.ocrmanagers = "Équipe OCR Radio";
this.mixwavemanagers = "Équipe Mixwave";
this.jfinalfunkjob = "Fou des Mathématiques";
this.relayadmins = "Donneurs de Relais";
this.specialthanks = "Merci à";
this.poweredby = "Fonctionne Avec";
this.customsoftware = "Programme 'Orpheus' Personalisé";
this.donationinformation = "Liste de Dons et Informations.";
this.apiinformation = "Documentation de l'API.";

/* Help */

this.helpstart = "Commence &#9654; ";
this.helpnext = "Prochain &#9654; ";
this.helplast = "Terminé &#9654; ";
this.about = "À Propos / Dons / API";
this.about_p = "Équipe, technologie utilisée, et informations pour dons.";
this.voting = "Vote";
this.voting_p = "Chaque chanson jouée fait partie d'une élection. La chanson avec le plus de votes jouera au prochain tour.<br /><br />Apprendre à voter.";
this.clickonsongtovote = "Cliquez Sur une Chanson Pour Voter";
this.clickonsongtovote_p = "Lorsque vous êtes à l'écoute d'une station, cliquez sur une chanson.<br /><br />La chanson avec le plus de votes jouera au prochain tour.";
this.tunein = "Être À l'Écoute d'une Station";
this.tunein_p = "Utilisez le Lecteur Flash du navigateur pour être à l'écoute de la station.<br /><br />Vous pouvez aussi télécharger un M3U en cliquant sur l'icône de votre Lecteur Média préféré.";
this.login = "Se Connecter ou s'Enregistrer";
this.login_p = "S.v.p., connectez vous.";
this.ratecurrentsong = "Évaluations";
this.ratecurrentsong_p = "Déplacez votre curseur au-dessus du graphique et cliquez pour évaluer une chanson.<br /><br />L'évaluation des albums sont faits par une moyenne des évaluations de chaque chanson.";
this.ratecurrentsong_t = "Les évaluations affectent la fréquence à laquelle les chansons et les albums seront joués.<br /><br />Apprendre à Évaluer.";
this.ratecurrentsong_tp = "Évaluations";
this.setfavourite = "Favoris";
this.setfavourite_p = "Cliquez sur la boîte à la fin de la barre d'évaluation pour ajouter, ou enlever, une chanson à vos favoris.";
this.playlistsearch = "Rechercher dans la Liste Musicale";
this.playlistsearch_p = "Lorsque la Liste Musicale est ouverte, tappez simplement un mot pour commencer la recherche.<br /><br />Utilisez votre souris ou les touches haut/bas pour naviguer.";
this.request = "Demandes Spéciales";
this.request_p = "Faire la Demande Spéciale d'une chanson la mettra dans une élection.<br /><br />Apprendre à faire une demande spéciale.";
this.openanalbum = "Ouvrir un album";
this.openanalbum_p = "Cliquez sur un album dans le panneau Liste Musicale.<br /><br />Les albums à la fin de la Liste Musicale sont en recharge et ne peuvent pas être demandés.";
this.clicktorequest = "Faire une Demande Spéciale";
this.clicktorequest_p = "Cliquez sur le bouton R pour faire une Demande Spéciale.<br /><br />Les chansons à la fin de la Liste Musicale sont en recharge et ne peuvent être demandés.";
this.managingrequests = "Demandes Spéciales Glisser-Déposer";
this.managingrequests_p = "Glissez et déposez vos Demandes Spéciales pour les réorganiser, clickez sur le X pour les supprimer.";
this.timetorequest = "Status des Demandes Spéciales";
this.timetorequest_p = "Le status de votre Demande Spéciale est indiqué ici.<br /><br />S'il indique \"Expirant\" ou \"En Recharge\", vous devriez changer votre première Demande Spéciale.";

/* Schedule Panel */

this.newliveshow = "Nouvelle Diffusion En Direct";
this.newliveexplanation = "Le temps peut être 0 (maintenant) ou un temps futur en UTC.";
this.time = "Temps";
this.name = "Nom";
this.notes = "Notes";
this.user_id = "ID d'Utilisateur";
this.addshow = "Ajouter une Diffusion";
this.start = "Commence";
this.end = "Termine";
this['delete'] = "Supprimer";
this.lengthinseconds = "Temps en Secondes";
this.djblock = "Bloc DJ?";
this.djadmin = "DJ Administrateur";
this.pausestation = "Pause Station";
this.endpause = "Terminer Pause";
this.getready = "Prêt?";
this.standby = "En Attente";
this.mixingok = "Mixing On";
this.connect = "Connexion";
this.HOLD = "HOLD";
this.onair = "Live";
this.endnow = "Terminer la Diffusion";
this.wrapup = "Conclure";
this.dormant = "Dormant";
this.OVERTIME = "TEMPS SUPPLÉMENTAIRE";
this.noschedule = "Aucun évenement plannifié pour cette semaine.";

// Requests
this.requestok = "Demande Spéciale OK!";
this.reqexpiring = " (expirant!)";
this.reqfewminutes = " (quelques minutes)";
this.reqsoon = " (bientôt)";
this.reqshortwait = " (attente courte)";
this.reqwait = " (en attente)";
this.reqlongwait = " (attente longue)";
this.reqoncooldown = " (en recharge)";
this.reqempty = " (vide)";
this.reqwrongstation = " (mauvaise station)";
this.reqtechtitlefull = " (|S:position| avec |requestcount|)";
this.reqtechtitlesimple = " (|requestcount|)";

/* Others */
this.nowplaying = "En Cours de Lecture";
this.requestedby = "Demandé par |requester|.";
this.oncooldownfor = "En Recharge pour |cooldown|.";
this.conflictedwith = "En Conflit avec la Demande Spéciale de |requester|.";
this.conflictswith = "En Conflit avec la Demande Spéciale de |requester|.";
this.election = "Élection";
this.previouslyplayed = "Joué Précédemment";
this.votes = "|votes| |P:votes,Vote|";
this.votelockingin = "Vote complet dans |timeleft|...";
this.submittingvote = "Vote en soumission...";
this.voted = "Voté";
this.selectstation = "Choisir la Station";
this.tunedin = "À l'Écoute";
this.tunedout = "Non À l'Écoute";
this.play = "&#9654; Jouer dans le Navigateur";
this.help = "Aide";
this.forums = "Forums";
this.liveshow = "Diffusion en Directe";
this.adset = "Publicité";
this.onetimeplay = "Lecture Immédiate";
this.deleteonetime = "Supprimer la Lecture Immédiate";
this.currentdj = "dj |username|";
this.login = "Connexion";
this.register = "S'Enregistrer";
this.username = "Nom d'Utilisateur";
this.password = "Mot de Passe";
this.autologin = "Auto-Connexion";
this.compatplayers = "Lecteurs Supportés:";
this.electionresults = "Résultats de l'Élection";
this.chat = "Chat";
this.playing = "&#9633; Arrêter la Lecture";
this.loading = "Chargement";
this.searching = "Recherche: ";
this.m3uhijack = "|plugin| essaie de détourner le téléchargement du M3U. S.v.p., faire souris-droite et 'Sauvegarder en tant que.'";
this.menu_morestations = "Plus &#9660;"
this.from = "de |username|";

/* Words for pluralization */

this.person = "personne";
this.person_p = "personnes";
this.Vote = "Vote";
this.Vote_p = "Votes";

};