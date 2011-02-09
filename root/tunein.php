<?php

header('Content-type: audio/x-mpegurl');
header("Cache-Control: no-cache, must-revalidate");
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT");

require("auth/common.php");

$playlistfile = "";

if ($sid == RW) $playlistfile = "rainwave.m3u";
else if ($sid == OCR) $playlistfile = "ocr_radio.m3u";
else if ($sid == VW) $playlistfile = "vwave.m3u";

if (preg_match("/MSIE 5.5/", $_SERVER['HTTP_USER_AGENT'])) {
       header("Content-Disposition: filename=\"" . $playlistfile . "\"");
}
else {
       header("Content-Disposition: inline; filename=\"" . $playlistfile . "\"");
}

$userstring = "";
if ($user_id > 1) {
        $listenkey = $userdata['radio_listenkey'];
        if (($userdata['radio_listenkey'] == "") || ($_GET['genkey'] == '1')) {
                $listenkey = md5(uniqid(rand(), true));
                $listenkey = substr($listenkey, 0, 10);
                bb_updateDB("UPDATE phpbb_users SET radio_listenkey = '$listenkey' WHERE user_id = $user_id");
        }
        $userstring = "?" . $user_id . ":" . $listenkey . "";
}

print "#EXTM3U\n";
if ($sid == RW) {
	print "#EXT3INF:0,Rainwave Random Relay\n";
	print "http://rwstream.rainwave.cc:8000/rainwave.ogg" . $userstring . "\n";
	print "#EXT3INF:0,Rainwave Relay 1 - Donated by Tanaric - California, USA\n";
	print "http://radio.petosky.net:8000/rainwave.ogg" . $userstring . "\n";
	print "#EXT3INF:0,Rainwave Relay 2 - Donated by Lyfe - Connecticut, USA\n";
	print "http://stream1.gameowls.com:8000/rainwave.ogg" . $userstring . "\n";
	print "#EXT3INF:0,Rainwave Relay 3 - Donated by Lyfe - Connecticut, USA\n";
	print "http://stream2.gameowls.com:8000/rainwave.ogg" . $userstring . "\n";
	print "#EXT3INF:0,Rainwave Overflow - Donated by Tanaric - California, USA\n";
	print "http://octosphere.com:8000/rainwave.ogg" . $userstring . "\n";
}
else if ($sid == OCR) {
	print "#EXTINF:0,OCR Radio Random Relay\n";
	print "http://ocrstream.rainwave.cc:8000/ocremix.ogg" . $userstring . "\n";
	print "#EXTINF:0,OCR Radio Relay 1 - Donated by Dracoirs - Arizona, USA\n";
	print "http://ormgas.dracoirs.com:8000/ormgas.ogg" . $userstring . "\n";
	print "#EXTINF:0,OCR Radio Relay 2 - Donated by Lyfe - Connecticut, USA\n";
	print "http://stream1.gameowls.com:8000/ocremix.ogg" . $userstring . "\n";
	print "#EXTINF:0,OCR Radio Relay 3 - Donated by Lyfe - Connecticut, USA\n";
	print "http://stream2.gameowls.com:8000/ocremix.ogg" . $userstring . "\n";
}
else if ($sid == MW) {
	print "#EXTINF:0,Mixwave Relay 1 - Rainwave Core Server - Toronto, Canada\n";
	print "http://rainwave.cc:8000/mixwave.ogg" . $userstring . "\n";
}

cleanUp(false);

?>
