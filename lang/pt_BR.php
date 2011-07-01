<?php
/* Rainwave 3 pt_BR Language File by ocrfan */
$lang2 = array(
	"_SITEDESCRIPTIONS" => array(
		// Rainwave's description as it appears to search engines.
		1 => "Rádio Online de Músicas de Video Game.  Vote na música que quiser ouvir!",
		// OCR Radio's description as it appears to search engines.
		2 => "Rádio OverClocked Remix.  Vote nos seus remixes favoritos!",
		// Mixwave's.
		3 => "Bandas cover e remixes de Video Game.  Vote nos seus artistas favoritos!"
	),

	// Panel Names, these show up in the tab titles
	"p_MainMPI" => "Abas",
	"p_MenuPanel" => "Menu",
	"p_PlaylistPanel" => "Lista de Reprodução",
	"p_PrefsPanel" => "Preferências",
	"p_SchedulePanel" => "Agenda",
	"p_NowPanel" => "Em Reprodução",
	"p_RequestsPanel" => "Requisições",
	"p_TimelinePanel" => "Linha de Tempo",
	"p_ListenersPanel" => "Ouvintes",
	
	// These are used for cooldown times, e.g. 5d 23h 10m 46s.  Change to your liking.
	"timeformat_d" => "d ",
	"timeformat_h" => "h ",
	"timeformat_m" => "m ",
	"timeformat_s" => "s ",

	// Edi error codes
	"log_1" => "ID da estação não fornecido para a API.",
	"log_2" => "Esta estação está fora do ar no momento devido a dificuldades técnicas.",
	"log_3" => "Por favor aguarde para usar |currentlyon|.",
	
	// HTTP error codes
	"log_200" => "HTTP OK",
	"log_300" => "HTTP Redirecionado",
	"log_301" => "HTTP Movido",
	"log_307" => "HTTP Redirecionado",
	"log_400" => "HTTP Solicitação Inválida",
	"log_401" => "HTTP Não Autorizado",
	"log_403_anon" => "Alguém mais no seu endereço IP já está usando a Rainwave.  Por favor, registre-se para resolver este problema.",
	"log_403_reg" => "Erro de Autorização de API - Por favor, atualize a página.",
	"log_404" => "HTTP Não Encontrado",
	"log_408" => "HTTP Tempo Limite da Solicitação",
	"log_500" => "Dificuldades técnicas - por favor tente novamente ou reporte o erro.",
	"log_502" => "Dificuldades técnicas - por favor aguarde.",
	"log_503" => "Rainwave está enfrentando alta carga, por favor tente novamente.",
	
	// Lyre-AJAX Codes, these should NEVER show up...
	"log_1000" => "Oops!  Você encontrou um erro!",
	"log_1001" => "Resposta JSON incorreta do servidor.",
	
	// Election Errors
	"log_2000" => "Erro no servidor ao enviar voto.",
	"log_2001" => "Você precisa estar sintonizado para votar.",
	"log_2002" => "ID de candidato inválida.",
	"log_2003" => "Você já votou nesta eleição.",
	"log_2004" => "Você precisa aguardar para votar ao alternar entre estações.",
	"log_2005" => "Inscrição de candidato inexistente.",
	"log_2006" => "A eleição já foi decidida.",
	"log_2007" => "Você ainda não pode votar nesta eleição.",
	"log_2008" => "Você precisa votar na estação em que está sintonizado.",
	
	// Making-a-Request Errors
	"log_3000" => "Erro no servidor ao enviar requisição.  Por favor tente novamente.",
	"log_3001" => "Você precisa entrar para requisitar.",
	"log_3002" => "Você precisa sintonizar para requisitar.",
	"log_3003" => "ID de música inválida enviada.",
	"log_3004" => "Música inexistente requisitada.",
	"log_3005" => "Você precisa requisitar uma música da estação atual.",
	"log_3006" => "Limite de requisições atingido.",
	"log_3007" => "Música já requisitada.",
	"log_3008" => "Álbum já requisitado.",
	
	// Request Deletion Errors
	"log_4000" => "Erro no servidor ao remover requisição.  Por favor tente novamente.",
	"log_4001" => "Você precisa estar sintonizado para mudar requisições.",
	"log_4002" => "Erro no cliente ao enviar mudança.  Por favor atualize sua página e tente novamente.",
	"log_4003" => "Esta requisição não pertence a você.",
	
	// Request Change Errors (swapping 1 request for another)
	"log_6000" => "Erro no servidor ao alterar requisição.  Por favor tente novamente.",
	"log_6001" => "Você precisa entrar para usar requisições.",
	"log_6002" => "Erro no cliente ao enviar mudança.  Por favor atualize sua página e tente novamente.",
	"log_6003" => "Erro no cliente ao enviar mudança.  Por favor atualize sua página e tente novamente, ou tente uma música diferente.",
	"log_6004" => "Esta requisição não pertence a você.",
	"log_6005" => "Você requisitou uma música inexistente.",
	"log_6006" => "Voce precisa requisitar uma música na estação em que está sintonizado.",
	"log_6007" => "Você já requisitou esta música.",
	"log_6008" => "Você já requisitou uma música do deste álbum.",
	
	// Rating Errors
	"log_7000" => "Erro no servidor ao enviar avaliação.  Por favor tente novamente.",
	"log_7001" => "Você precisa entrar para avaliar.",
	"log_7002" => "Você precisa sintonizar para avaliar.",
	"log_7003" => "Erro no cliente ao enviar avaliação.  Por favor atualize sua página e tente novamente.",
	"log_7004" => "Erro no cliente ao enviar avaliação.  Por favor atualize sua página e tente novamente.",
	"log_7005" => "Erro no cliente ao enviar avaliação.  Por favor atualize sua página e tente novamente.",
	"log_7006" => "Você precisa ter estado recentemente sintonizado com esta música para avliá-la.",
	"log_7007" => "Você precisa aguardar para avaliar ao alternar entre estações.",
	
	// Request Re-order Errors
	"log_8000" => "Erro no servidor ao reordenar.  Por favor tente novamente.",
	"log_8001" => "Erro no cliente ao formar pedido de reordenamento.  Por favor tente novamente.",
	"log_8002" => "Você não possui requisições para reordenar.",
	"log_8003" => "Uma das suas requisições foi atentida.  Por favor tente novamente.",
	
	// Login Errors
	"log_9000" => "Nome de usuário ou senha inválida.",
	"log_9001" => "Muitas tentativas de entrar. Por favor vá para os fórums.",
	"log_9002" => "Erro ao entrar.  Por favor vá para os fórums.",

	// Playlist Related
	"pltab_albums" => "Álbuns",
	"pltab_artists" => "Artistas",
	"overclockedremixes" => "Remixes OverClocked",
	"mixwavesongs" => "Músicas Mixwave",
	
	// Playlist Sentences, these all show up in the album detail pages.
	
	"pl_oncooldown" => "Resfriando por |time|.",
	"pl_ranks" => "Avaliado em |rating|, classificado |rank|°.",
	"pl_favourited" => "Marcado como favorito por |count| |P:count,person|.",
	"pl_wins" => "Vence |percent|% das eleições que participa.",
	"pl_requested" => "Requisitado |count| |P:count,times|, classificado |rank|°.",
	"pl_genre" => "Grupo de resfriamento: ",
	"pl_genre2" => ".",
	"pl_genres" => "Grupos de resfriamento: ",
	"pl_genres2_normal" => ".",
	"pl_genres2_more" => " & outros.",
	
	// Listeners Panel
	
	"ltab_listeners" => "Ouvintes", 			// Listeners tab name
	"otherlisteners" => "(|guests| visitantes, |total| total)",
	"registeredlisteners" => "|users| Usuários",
	"voteslast2weeks" => "Votos nas últimas 2 semanas: ",
	"voterecord" => "Histórico de Votos: ",
	"requestrecord" => "Histórico de Requisições: ",
	"votewinloss" => "|wins| |P:wins,vitoria|, |losses| |P:losses,derrota| -- wins |ratio|%",
	"requestwinloss" => "|wins| |P:wins,reproduzida|, |losses| |P:losses,rejeitada| -- reproduziu |ratio|%",
	"lsnr_rankgraph_header" => "Votos e avaliações no último mês",
	"lsnrdt_allstations" => "Todas as Estações",
	"lsnrdt_averagerating" => "Avaliação Média",
	"lsnrdt_ratingprogress" => "Completude da Avaliação",
	"lsnrdt_percentofratings" => "Parcela de Avaliação",
	"lsnrdt_percentofrequests" => "Parcela de Requisição",
	"lsnrdt_percentofvotes" => "Parcela de Voto",

	// Preference names
	
	"pref_refreshrequired" => "(necessita atualização de página)",
	"pref_timeline" => "Linha de Tempo",
	"pref_timeline_linear" => "Linha de Tempo Linear",
	"pref_timeline_showhistory" => "Mostrar Histórico",
	"pref_timeline_showelec" => "Mostrar Resultados de Eleições",
	"pref_timeline_showallnext" => "Mostrar Todos os Próximos Eventos",
	"pref_rating_hidesite" => "Esconder Avaliações Globais Até Eu Avaliar",
	"pref_edi" => "Geral",
	"pref_edi_wipeall" => "Apagar Preferências",
	"pref_edi_wipeall_button" => "Apagar",
	"pref_edi_language" => "Linguagem",
	"pref_edi_theme" => "Tema",
	"pref_edi_resetlayout" => "Restaurar Apresentação",
	"pref_edi_resetlayout_button" => "Restaurar",
	"pref_fx" => "Efeitos",
	"pref_fx_fps" => "Taxa de Quadros de Animações",
	"pref_fx_enabled" => "Animação Ativada",
	"pref_requests" => "Requisições",
	"pref_requests_technicalhint" => "Título Técnico de Aba",
	"pref_timeline_highlightrequests" => "Mostrar Requisitantes Por Padrão",
	
	// About screen
	
	"creator" => "Criador",
	"rainwavemanagers" => "Equipe Rainwave",
	"ocrmanagers" => "Equipe OCR Radio",
	"mixwavemanagers" => "Equipe Mixwave",
	"jfinalfunkjob" => "Math Madman",
	"relayadmins" => "Doadores de Retransmissão",
	"specialthanks" => "Agradecimento a",
	"poweredby" => "Powered By",
	"customsoftware" => "Aplicativo 'Orpheus' personalizado",
	"donationinformation" => "Registro e informações de doação.",
	"apiinformation" => "Documentação da API.",
	"translators" => "Tradutores",
	"rainwave3version" => "Rainwave 3 Versão",
	"revision" => "Rev",
	
	// Help
	// Careful, a lot of those funny blocks are there because Courier New doesn't have the UTF-8 arrow icons.
	// "blank" is a header
	// "blank_p" is an explanatory paragraph, part of a tutorial
	// "blank_t" is the short explanation of what tutorial follows when you click on the help box
	
	"helpstart" => "Iniciar ▶ ",
	"helpnext" => "Próximo ▶ ",
	"helplast" => "Fechar ▶ ",
	"about" => "Sobre / Doações",
	"about_p" => "Equipe, tecnologia utilizada, e informação sobre doação.",
	"voting" => "Votação",
	"voting_p" => "Cada música reproduzida é parte de uma eleição.  A música com mais votos é reproduzida em seguida.|br|Aprenda como votar.",
	"clickonsongtovote" => "Clique em uma Música para Votar",
	"clickonsongtovote_p" => "Depois de sintonizar, clique em uma música.|br|A música com mais votos é reproduzida em seguida.",
	"tunein" => "Sintonizar",
	"tunein_p" => "Baixe o arquivo M3U e use seu reprodutor multimídia para ouvir.|br|VLC, Winamp, Foobar2000, e fstream (Mac) são recomendados.",
	"login_p" => "Por favor entre.",
	"ratecurrentsong" => "Avaliação",
	"ratecurrentsong_p" => "Mova seu mouse sobre a barra, e clique para avaliar a música.|br|Avaliação de álbuns são a média das suas avaliações das músicas.",
	"ratecurrentsong_t" => "Avaliação afeta com que frequência músicas e álbuns são reproduzidos.|br|Aprenda a avaliar.",
	"ratecurrentsong_tp" => "Avaliação",
	"setfavourite" => "Favoritos",
	"setfavourite_p" => "Clique na caixa no fim da barra de avaliações para marcar, ou desmarcar, seus favoritos.",
	"playlistsearch" => "Pesquisar na Lista de Reprodução",
	"playlistsearch_p" => "Com a Lista de Reprodução aberta, apenas começe a digitar para executar uma busca na lista.|br|Use seu mouse or teclas acima/abaixo para navegar.",
	"request" => "Requisições",
	"request_p" => "Requisições colocam as músicas que você quer em uma eleição.|br|Aprenda a requisitar.",
	"openanalbum" => "Abra um álbum",
	"openanalbum_p" => "Clique em um álbum no painel da Lista de Reprodução.|br|Álbuns no fim da lista estão resfriando e não podem ser requisitados.",
	"clicktorequest" => "Faça uma Requisição",
	"clicktorequest_p" => "Clique no botão R para fazer a requisição.|br|Músicas no final do álbum estão resfriando e não podem ser requisitadas.",
	"managingrequests" => "Arrastar e Soltar Requisições",
	"managingrequests_p" => "Arraste e solte para reordenar suas requisições, ou clique X para remover uma delas.",
	"timetorequest" => "Estado da Requisição",
	"timetorequest_p" => "O estado de sua requisição é indicado aqui.|br|Se indicar \"Expirando\" or \"Resfriando\", você deve alterar sua 1ª requisição.",
	
	// What happens when RW crashes
	
	"crashed" => "Rainwave não está funcionando.",
	"submiterror" => "Por favor, copie e cole o conteúdo abaixo e publique nos fóruns para ajudar a corrigir o problema:",
	"pleaserefresh" => "Atualize a página para usar Rainwave novamente.",
	
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

	"noschedule" => "Nenhum evento planejado para esta semana.",
	
	// Searching Related
	
	"escapetoclear" => "[esc] para limpar",
	"searchheader" => "Buscar: ",

	// Requests
	
	"requestok" => "Requisitado",
	"reqexpiring" => " (expirando!)",
	"reqfewminutes" => " (alguns minutos)",
	"reqsoon" => " (breve)",
	"reqshortwait" => " (espera curta)",
	"reqwait" => " (esperando)",
	"reqlongwait" => " (espera longa)",
	"reqoncooldown" => " (resfriando)",
	"reqempty" => " (vazio)",
	"reqwrongstation" => " (estação errada)",
	"reqtechtitlefull" => " (|station||position|° com |requestcount|)",
	"reqtechtitlesimple" => " (|station||requestcount|)",
	"reqexpiresin" => " (lugar na fila expira em |expiretime|)",
	"reqexpiresnext" => " (lugar na fila expira na próxima requisição)",
	"reqnorequests" => "Nenhuma Requisição Enviada",
	"reqmyrequests" => "Minhas Requisições",
	"reqrequestline" => "Fila de Requisições",
	"reqrequestlinelong" => "Primeiros |showing| de |linesize| na fila",
	"reqalbumblocked" => "Bloqueado; álbum está em uma eleição.",
	"reqgroupblocked" => "Bloqueado; grupo de resfriamento está em uma eleição.",
	
	// Now Playing and Timeline panels

	"nowplaying" => "Em Reprodução",
	"remixdetails" => "Detalhes do Remix",
	"songhomepage" => "Página da Música",
	"requestedby" => "Requisitado por |requester|",
	"oncooldownfor" => "Resfriando por |cooldown|.",
	"conflictedwith" => "Conflitou com requisição de  |requester|",
	"conflictswith" => "Conflita com requisição de |requester|.",
	"election" => "Eleição",
	"previouslyplayed" => "Reproduzido anteriormente",
	"votes" => "|votes| |P:votes,Vote|",
	"votelockingin" => "Trancando voto em |timeleft|...",
	"submittingvote" => "Enviando voto...",
	"voted" => "Votado",
	"liveshow" => "Show Ao Vivo",
	"adset" => "Publicidade",
	"onetimeplay" => "Reprodução Única",
	"deleteonetime" => "Remover Reprodução Única",
	"currentdj" => "dj |username|",
	"electionresults" => "Resultado da Eleição",
	"from" => "de |username|",
	"votefaileleclocked" => "Voto falhou, eleição encerrada",
	
	// Menu Bar
	
	"selectstation" => "Selecionar Estação",
	"tunedin" => "Sintonizado",
	"tunedout" => "Não Sintonizado",
	"play" => "▶ Reproduzir no Navegador",
	"downloadm3u" => "▶ Baixar M3U",
	"players" => "Reprodutores multimídia suportados são VLC, Winamp, Foobar2000, e fstream (Mac/iPhone).|br|Windows Media Player e iTunes não funcionarão.",
	"help" => "Ajuda",
	"forums" => "Fóruns",
	"login" => "Entrar",
	"logout" => "Sair",	
	"register" => "Registrar",
	"username" => "Usuário",
	"password" => "Senha",
	"autologin" => "Entrar automaticamente",
	"compatplayers" => "Reprodutores Multimídia Suportados:",
	"chat" => "Chat",
	"playing" => "◼ Parar Reprodução",
	"loading" => "Carregando",
	"searching" => "Buscando: ",
	"m3uhijack" => "|plugin| está tentando se apoderar do arquivo M3U baixado.  Por favor, use clique direito e 'Salvar Como'.",
	"menu_morestations" => "Mais ▼",
	"waitingforstatus" => "Aguardado por Estado",
	"managekeys" => "Gerenciar Chaves de API",
	"listenerprofile" => "Perfil do ouvinte",
	
	/* Words for pluralization */

	"person" => "pessoa",
	"person_p" => "pessoas",
	"Vote" => "Voto",
	"Vote_p" => "Votos",
	"times" => "vez",
	"times_p" => "vezes",
	"vitoria" => "vitória",
	"vitoria_p" => "vitórias",
	"derrota" => "derrota",
	"derrota_p" => "derrotas",
	"reproduzida" => "reproduzida",
	"reproduzida_p" => "reproduzidas",
	"rejeitada" => "rejeitada",
	"rejeitada_p" => "rejeitadas",
);
?>