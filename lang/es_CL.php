<?php
/* Rainwave 3 es_CL Language File by BreadMaker aka CTM */

$lang2 = array(
  "_SITEDESCRIPTIONS" => array(
		// Rainwave's description as it appears to search engines.
		1 => "Radio por Internet de Música de Videojuegos. ¡Vota por la canción que quieres escuchar!",
		// OCR Radio's description as it appears to search engines.
		2 => "La Radio de OverClocked Remix. ¡Vota por tus remixes favoritos!",
		// Mixwave's.
		3 => "Covers y Remixes de Música de Videojuegos. ¡Vota por tus artistas favoritos!"
	),
	
	// Panel Names, these show up in the tab titles
	"p_MainMPI" => "Pestañas",
	"p_MenuPanel" => "Menú",
	"p_PlaylistPanel" => "Lista de canciones",
	"p_PrefsPanel" => "Preferencias",
	"p_SchedulePanel" => "Eventos",
	"p_NowPanel" => "Ahora Reproduciendo",
	"p_RequestsPanel" => "Peticiones",
	"p_TimelinePanel" => "Cronograma", // T.N.: I think it's the best word to describe this item
	
	// These are used for cooldown times, e.g. 5d 23h 10m 46s. Change to your liking.
	"timeformat_d" => "d ",
	"timeformat_h" => "h ",
	"timeformat_m" => "m ",
	"timeformat_s" => "s ",

	// Edi error codes
	"log_1" => "La API no ha recibido la identificación de la estación.",
	"log_2" => "Ésta estación se encuentra fuera de línea debido a dificultades técnicas.",
	"log_3" => "Espere para poder usar |currentlyon|.",
	
	// HTTP error codes
	"log_200" => "HTTP OK",
	"log_300" => "HTTP Redireccionado",
	"log_301" => "HTTP Movido",
	"log_307" => "HTTP Redireccionado",
	"log_400" => "HTTP Solcitud mal recibida",
	"log_401" => "HTTP No Autorizado",
	"log_403_anon" => "Otro equipo con la misma dirección IP está usando Rainwave. Regístrese para solucionar éste problema",
	"log_403_reg" => "Error de autorización de API - Recargue la página.",
	"log_404" => "HTTP No Encontrado",
	"log_408" => "HTTP Tiempo de espera agotado",
	"log_500" => "Dificultades técnicas - Inténtelo nuevamente, si el problema continúa, reporte el bug.",
	"log_502" => "Dificultades técnicas - Espere...",
	"log_503" => "Rainwave expermienta una sobrecarga, intente nuevamente.",
	
	// Lyre-AJAX Codes, these should NEVER show up...
	"log_1000" => "Ups... ¡Encontraste un bug!",
	"log_1001" => "Respuesta de JSON mal construida desde el servidor.",
	
	// Election Errors
	"log_2000" => "Error del lado del servidor mientras se enviaba el voto.",
	"log_2001" => "Debe estar sintonizado para poder votar.",
	"log_2002" => "ID de candidato inválida.",
	"log_2003" => "Ya ha votado.",
	"log_2004" => "Debe esperar para votar cuando cambia de estación.",
	"log_2005" => "El candidato votado no existe.",
	"log_2006" => "La votación ha finalizado.",
	"log_2007" => "No puede votar en ésta elección todavía.",
	"log_2008" => "Debe votar en la estación en la cual está sintonizado.",
	
	// Making-a-Request Errors
	"log_3000" => "Error del lado del servidor mientras se enviaba el voto. Intente nuevamente.",
	"log_3001" => "Debe acceder para hacer una petición.",
	"log_3002" => "Debe estar sintonizado para hacer una petición.",
	"log_3003" => "Se ha recibido una ID de canción inválida.",
	"log_3004" => "La canción pedida no existe.",
	"log_3005" => "Debe pedir una canción en la estación en la que está sintonizado.",
	"log_3006" => "Límite de peticiones alcanzado.",
	"log_3007" => "Canción ya pedida.",
	"log_3008" => "Álbum ya pedido.",
	
	// Request Deletion Errors
	"log_4000" => "Error del lado del servidor mientras se eliminaba la petición. Intente nuevamente.",
	"log_4001" => "Debe acceder para cambiar sus peticiones.",
	"log_4002" => "Error del lado del cliente mientras se enviaba el cambio. Recargue la página e intente nuevamente.",
	"log_4003" => "Esa petición no le pertenece.",
	
	// Request Change Errors (swapping 1 request for another)
	"log_6000" => "Error del lado del servidor mientras se cambiaba la petición. Intente nuevamente.",
	"log_6001" => "Debe acceder para usar las peticiones.",
	"log_6002" => "Error del lado del cliente mientras se enviaba el cambio. Recargue la página e intente nuevamente.",
	"log_6003" => "Error del lado del cliente mientras se enviaba el cambio. Recargue la página e intente nuevamente, o intente con una canción diferente.",
	"log_6004" => "Esa petición no le pertenece.",
	"log_6005" => "Ha pedido una canción que no existe.",
	"log_6006" => "Debe pedir una canción de la estación a la cual esté sintonizado.",
	"log_6007" => "Ya ha pedido ésa canción.",
	"log_6008" => "Ya ha pedido una canción de ése álbum.",
	
	// Rating Errors
	"log_7000" => "Error del lado del servidor mientras se enviaba la valoración. Intente nuevamente.",
	"log_7001" => "Debe acceder para poder valorar.",
	"log_7002" => "Debe estar sintonizado para poder valorar.",
	"log_7003" => "Error del lado del cliente mientras se enviaba la valoración. Recargue la página e intente nuevamente.",
	"log_7004" => "Error del lado del cliente mientras se enviaba la valoración. Recargue la página e intente nuevamente.",
	"log_7005" => "Error del lado del cliente mientras se enviaba la valoración. Recargue la página e intente nuevamente.",
	"log_7006" => "Debe haberse sintonizado mientras sonaba la canción para poder valorarla.",
	"log_7007" => "Debe esperar para valorar cuando se cambie de estación.",
	
	// Request Re-order Errors
	"log_8000" => "Error del lado del servidor mientras se reordenaba. Intente nuevamente.",
	"log_8001" => "Error del lado del cliente mientra se creaba la solicitud para reordenar. Intente nuevamente.",
	"log_8002" => "No tiene peticiones para reordenar.",
	"log_8003" => "Una de sus peticiones se ha cumplido. Intente nuevamente.",
	
	// Login Errors
	"log_9000" => "Usuario y/o contraseña inválidos.",
	"log_9001" => "Demasiados intentos de inicio de sesión. Por favor, ve a los foros.",
	"log_9002" => "Error al iniciar sesión. Por favor, pregunta en los foros",
	
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
		Whichever suffix exists first gets used. If no suffix existed, Rainwave would just use "3."
		You cannot replace the number here, nor does Rainwave have support for multiple suffixes for languages which
			use different counters for different types of objects.
	*/
	"suffix_0" => "º",
	"suffix_1" => "º",
	"suffix_2" => "º",
	"suffix_3" => "º",
	"suffix_4" => "º",
	"suffix_5" => "º",
	"suffix_6" => "º",
	"suffix_7" => "º",
	"suffix_8" => "º",
	"suffix_9" => "º",
	"suffix_10" => "º",
	"suffix_11" => "º",
	"suffix_12" => "º",
	"suffix_13" => "º",
	
	// Playlist Sentences, these all show up in the album detail pages.
	
	"pl_oncooldown" => "En enfriamiento por |time|.",
	"pl_ranks" => "Valoración: |rating|, lugar |S:rank| del ránking.",
	"pl_favourited" => "Favorito por |count| |P:count,person|.",
	"pl_wins" => "Ha ganado |percent|% de las votaciones.",
	"pl_requested" => "Pedida |count| veces, lugar |S:rank| del ránking.",
	"pl_genre" => "Grupo de enfriamiento: ",
	"pl_genre2" => ".",
	"pl_genres" => "Grupos de enfriamiento: ",
	// If there's more than 3 cooldown groups across all songs in an album, Rainwave truncates the list and uses " & others."
	// So you'll see "Cooldown groups: foo, bar, baz, & others." if there's more than 3. But if only 3 exist: "Cooldown groups: foo, bar, baz."
	"pl_genres2_normal" => ".",
	"pl_genres2_more" => ", entre otros.",
	
	// Preference names
	
	"pref_refreshrequired" => "(se requiere recargar)",
	"pref_timeline" => "Cronograma",
	"pref_timeline_linear" => "Cronograma Lineal",
	"pref_timeline_showhistory" => "Mostrar Historial",
	"pref_timeline_showelec" => "Mostrar Resultados Votación",
	"pref_timeline_showallnext" => "Mostrar Próximos Eventos",
	"pref_rating_hidesite" => "Esconder valoraciones hasta que yo lo haya hecho",
	"pref_edi" => "General", // T.N.: It's the same word for spanish.
	"pref_edi_wipeall" => "Borrar Preferencias",
	"pref_edi_wipeall_button" => "Borrar",
	"pref_edi_language" => "Idioma",
	"pref_edi_theme" => "Piel",
	"pref_edi_resetlayout" => "Restablecer Diseño",
	"pref_edi_resetlayout_button" => "Restablecer",
	"pref_fx" => "Efectos",
	"pref_fx_fps" => "Tasa de cuadros de las animaciones",
	"pref_fx_enabled" => "Activar animaciones",
	"pref_requests" => "Peticiones",
	"pref_requests_technicalhint" => "Mostrar más detalles en la pestaña",
	"pref_timeline_highlightrequests" => "Mostrar quien solicita por defecto",
	
	// About screen
	
	"creator" => "Creador",
	"rainwavemanagers" => "Equipo de Rainwave",
	"ocrmanagers" => "Equipo de OCR Radio",
	"mixwavemanagers" => "Equipo de Mixwave",
	"jfinalfunkjob" => "Loco de las Mates",
	"relayadmins" => "Donantes de Repetidoras",
	"specialthanks" => "Gracias A",
	"poweredby" => "Potenciado por",
	"customsoftware" => "Programa 'Orpheus' modificado",
	"donationinformation" => "Libro de Contabilidad de Donaciones e información relacionada.",
	"apiinformation" => "Documentación de la API.",
	"translators" => "Traductores",
	"rainwave3version" => "Rainwave Versión 3",
	"revision" => "Rev", // T.N.: It's the same word for spanish.
	
	// Help
	// Careful, a lot of those funny blocks are there because Courier New doesn't have the UTF-8 arrow icons.
	// "blank" is a header
	// "blank_p" is an explanatory paragraph, part of a tutorial
	// "blank_t" is the short explanation of what tutorial follows when you click on the help box
	
	"helpstart" => "Iniciar ▶ ",
	"helpnext" => "Siguiente ▶ ",
	"helplast" => "Cerrar ▶ ",
	"about" => "Acerca de / Donaciones",
	"about_p" => "Personas involucradas, tecnología usada, e información para donaciones.",
	"voting" => "Votar",
	"voting_p" => "Las canciones pueden ser votadas. La que obtenga más votos se reproducirá a continuación.|br|Aprende a votar.",
	"clickonsongtovote" => "Votar por una Canción",
	"clickonsongtovote_p" => "Luego de sintonizar, haz click en una canción.|br|La canción más votada sonará a continuación.",
	"tunein" => "Sintonizar",
	"tunein_p" => "Descarga el M3U y usa tu reproductor favorito para escuchar.|br|VLC, Winamp, Foobar2000, y fstream (Mac) son los recomendados.",
	"login" => "Accede o regístrate",
	"login_p" => "Inicia sesión.",
	"ratecurrentsong" => "Valorar",
	"ratecurrentsong_p" => "Mueve el mouse sobre la barra, y haz click para valorar la canción.|br|Las valoraciones de álbum se promedian de sus valoraciones de canción.",
	"ratecurrentsong_t" => "La valoración afecta que tan a menudo las canciones y sus álbumes son reproducidas.|br|Aprende a cómo valorar.",
	"ratecurrentsong_tp" => "Valoración",
	"setfavourite" => "Favoritos",
	"setfavourite_p" => "Haz click en la caja a la derecha de la barra para marcar o quitar la marca de favorito en una canción o álbum.",
	"playlistsearch" => "Búsqueda en Lista de Canciones",
	"playlistsearch_p" => "Mientras esté abierta la lista, sólo comienza a escribir para comenzar una búsqueda.|br|Usa el mouse o las teclas Arriba/Abajo para moverse entre los resultados.",
	"request" => "Peticiones",
	"request_p" => "Al pedir una canción la envías a una votación futura.|br|Aprende a pedir una canción.",
	"openanalbum" => "Abrir un álbum",
	"openanalbum_p" => "Haz click en un nombre de álbum en la Lista de Canciones.|br|Los álbumes al final de la lista están en enfriamiento y no pueden ser pedidos.",
	"clicktorequest" => "Hacer una Petición",
	"clicktorequest_p" => "Haz click en la R para hacer una petición.|br|Las canciones al final de la lista están en enfriamiento y no pueden ser pedidas.",
	"managingrequests" => "Mover Peticiones",
	"managingrequests_p" => "Arrastre para re-ordenar los peticiones, o haga click en la X para eliminar una petición.",
	"timetorequest" => "Estado de la Petición",
	"timetorequest_p" => "El estado de su petición se muestra aquí.|br|Si dice \"Expirando\" o \"Enfriando\", debería cambiar la petición que se encuentre en primer lugar.",
	
	// What happens when RW crashes
	
	"crashed" => "Rainwave se ha estrellado y caido estrepitosamente.",
	"submiterror" => "Por favor, copie y pegue lo que aparece abajo y publíquelo en los foros para ayudar en la depuración:",
	"pleaserefresh" => "Actualice la página para usar nuevamente Rainwave.",
	
	// Schedule Panel Administration Functions, does not need to be translated.
	// T.N.: So... why is it here, anyway? lol
	
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

	"noschedule" => "No hay eventos planificados para ésta semana.",
	
	// Requests
	
	"requestok" => "Pedido",
	"reqexpiring" => " (¡expirando!)",
	"reqfewminutes" => " (en pocos minutos)",
	"reqsoon" => " (pronto)",
	"reqshortwait" => " (espera corta)",
	"reqwait" => " (esperando)",
	"reqlongwait" => " (espera larga)",
	"reqoncooldown" => " (enfriandose)",
	"reqempty" => " (vacío)",
	"reqwrongstation" => " (estación equivocada)",
	"reqtechtitlefull" => " (|station||S:position| con |requestcount|)",
	"reqtechtitlesimple" => " (|station||requestcount|)",
	"reqexpiresin" => " (posición en cola expira en |expiretime|)",
	"reqexpiresnext" => " (posición en cola expira en próxima petición)",
	"reqnorequests" => "No se han hecho peticiones",
	"reqmyrequests" => "Tus Peticiones",
	"reqrequestline" => "Cola de Peticiones",
	"reqrequestlinelong" => "Mostrando |showing| de |linesize| en cola.",
	"reqruleblocked" => "Detenido; álbum o grupo está en votación.",
	"reqalbumblocked" => "Detenido; álbum está en votación.",
	"reqgroupblocked" => "Detenido; grupo de enfriamiento está en votación.",
	
	// Now Playing and Timeline panels

	"nowplaying" => "Ahora reproduciendo",
	"remixdetails" => "Detalles del Remix",
	"songhomepage" => "Sitio de la canción",
	"requestedby" => "Pedido por |requester|",
	"oncooldownfor" => "En enfriamiento por |cooldown|.",
	"conflictedwith" => "En conflicto con petición de |requester|",
	"conflictswith" => "En conficlto con petición de |requester|.", // T.N.: Present and past use the same word
	"election" => "Votación",
	"previouslyplayed" => "Anteriormente reproducidos",
	"votes" => "|votes| |P:votes,Vote|",
	"votelockingin" => "El voto se cierra en |timeleft|...",
	"submittingvote" => "Enviando voto...",
	"voted" => "Votado",
	"liveshow" => "Programa en vivo",
	"adset" => "Publicidad",
	"onetimeplay" => "Reproducción De-Una-Vez",
	"deleteonetime" => "Borrar Reproducción De-Una-Vez",
	"currentdj" => "DJ |username|",  // T.N.: It's the same word for spanish.
	"electionresults" => "Resultado de la votación",
	"from" => "de |username|",
	
	// Menu Bar
	
	"selectstation" => "Seleccione una Estación",
	"tunedin" => "Sintonizado",
	"tunedout" => "Desconectado",
	"play" => "▶ Reproducir en el Navegador",
	"downloadm3u" => "▶ Descargar M3U",
	"players" => "Los reproductores soportados son VLC, Winamp, Foobar2000, y fstream (Mac/iPhone).|br|Windows Media Player y iTunes no funcionarán.",
	"help" => "Ayuda",
	"forums" => "Foros",
	"login" => "Acceder",
	"register" => "Registro",
	"username" => "Usuario",
	"password" => "Contraseña",
	"autologin" => "Acceder automáticamente",
	"compatplayers" => "Reproductores soportados:",
	"chat" => "Chat", // T.N.: It's the same word for spanish.
	"playing" => "◼ Detener Reproducción",
	"loading" => "Cargando",
	"searching" => "Buscando: ",
	"m3uhijack" => "|plugin| está tratando de reproducir el M3U. Mejor haz click derecho y luego 'Guardar como'.",
	"menu_morestations" => "Más ▼",
	"waitingforstatus" => "Esperando por Estatus",
	"logout" => "Cerrar sesión",
	"managekeys" => "Administrar Claves de API",
	
	/* Words for pluralization */

	"person" => "persona",
	"person_p" => "personas",
	"Vote" => "Voto",
	"Vote_p" => "Votos",
);
?>
