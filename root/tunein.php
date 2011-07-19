<?php

header('Content-type: audio/x-mpegurl');
header("Cache-Control: no-cache, must-revalidate");
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT");

require("auth/common.php");

$playlistfile = "";

if ($sid == RW) $playlistfile = "rainwave.m3u";
else if ($sid == OCR) $playlistfile = "ocr_radio.m3u";
else if ($sid == VW) $playlistfile = "mixwave.m3u";

if (preg_match("/MSIE 5.5/", $_SERVER['HTTP_USER_AGENT'])) {
       header("Content-Disposition: filename=\"" . $playlistfile . "\"");
}
else {
       header("Content-Disposition: inline; filename=\"" . $playlistfile . "\"");
}

$userstring = $user_listen_key;

print "#EXTM3U\n";
if ($sid == RW) {
	print "#EXT3INF:0,Rainwave Random Relay\n";
	print "http://rwstream.rainwave.cc:8000/rainwave.ogg" . $userstring . "\n";
	print "#EXT3INF:0,Rainwave Relay 1 - Donated by Lyfe - Connecticut, USA\n";
	print "http://stream1.gameowls.com:8000/rainwave.ogg" . $userstring . "\n";
	print "#EXT3INF:0,Rainwave Relay 2 - Donated by Lyfe - Connecticut, USA\n";
	print "http://stream2.gameowls.com:8000/rainwave.ogg" . $userstring . "\n";
	print "#EXT3INF:0,Rainwave Relay 3 - Donated by Tanaric - USA - Firewall Friendly\n";
	print "http://textville.net/rainwave.ogg" . $userstring . "\n";
	print "#EXT3INF:0,Rainwave Overflow - Donated by Tanaric - California, USA\n";
	print "http://octosphere.com:8000/rainwave.ogg" . $userstring . "\n";
}
else if ($sid == OCR) {
	print "#EXTINF:0,OCR Radio Random Relay\n";
	print "http://ocrstream.rainwave.cc:8000/ocremix.ogg" . $userstring . "\n";
	print "#EXTINF:0,OCR Radio Relay 1 - Donated by Dracoirs - Arizona, USA\n";
	print "http://ormgas.dracoirs.com:8000/ocremix.ogg" . $userstring . "\n";
	print "#EXTINF:0,OCR Radio Relay 2 - Donated by Lyfe - Connecticut, USA\n";
	print "http://stream1.gameowls.com:8000/ocremix.ogg" . $userstring . "\n";
	print "#EXTINF:0,OCR Radio Relay 3 - Donated by Lyfe - Connecticut, USA\n";
	print "http://stream2.gameowls.com:8000/ocremix.ogg" . $userstring . "\n";
	print "#EXT3INF:0,OCR Radio Firewall Friendly - Donated by Tanaric - USA\n";
	print "http://textville.net/ocremix.ogg" . $userstring . "\n";
}
else if ($sid == MW) {
	print "#EXTINF:0,Mixwave Relay 1 - Rainwave Core Server - Toronto, Canada\n";
	print "http://mwstream.rainwave.cc:8000/mixwave.ogg" . $userstring . "\n";
	print "#EXT3INF:0,Mixwave Relay 2 - Donated by Tanaric - USA - Firewall Friendly\n";
	print "http://textville.net/mixwave.ogg" . $userstring . "\n";
}

cleanUp(false);

?>
