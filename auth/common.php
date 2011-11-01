<?php

define("RW", 1);
define("OCR", 2);
define("VW", 3);
define("MW", 3);
define("BIT", 4);
define("OMNI", 5);

$sid = OMNI;
if (isset($_COOKIE['r3sid'])) {
	if ($_COOKIE['r3sid'] == "1") $sid = RW;
	else if ($_COOKIE['r3sid'] == "2") $sid = OCR;
	else if ($_COOKIE['r3sid'] == "3") $sid = VW;
	else if ($_COOKIE['r3sid'] == "4") $sid = BIT;
	else if ($_COOKIE['r3sid'] == "5") $sid = OMNI;
}
// This gives precedence to URL if using a subdomained station
if ($_SERVER['HTTP_HOST'] == "rw.rainwave.cc") $sid = RW;
else if ($_SERVER['HTTP_HOST'] == "game.rainwave.cc") $sid = RW;
else if ($_SERVER['HTTP_HOST'] == "ocr.rainwave.cc") $sid = OCR;
else if ($_SERVER['HTTP_HOST'] == "ocremix.rainwave.cc") $sid = OCR;
else if ($_SERVER['HTTP_HOST'] == "remix.rainwave.cc") $sid = VW;
else if ($_SERVER['HTTP_HOST'] == "covers.rainwave.cc") $sid = VW;
else if ($_SERVER['HTTP_HOST'] == "cover.rainwave.cc") $sid = VW;
else if ($_SERVER['HTTP_HOST'] == "mix.rainwave.cc") $sid = VW;
else if ($_SERVER['HTTP_HOST'] == "mixwave.rainwave.cc") $sid = VW;
else if ($_SERVER['HTTP_HOST'] == "vwave.rainwave.cc") $sid = VW;
else if ($_SERVER['HTTP_HOST'] == "chip.rainwave.cc") $sid = BIT;
else if ($_SERVER['HTTP_HOST'] == "chiptune.rainwave.cc") $sid = BIT;
else if ($_SERVER['HTTP_HOST'] == "chiptunes.rainwave.cc") $sid = BIT;
else if ($_SERVER['HTTP_HOST'] == "bit.rainwave.cc") $sid = BIT;
else if ($_SERVER['HTTP_HOST'] == "omni.rainwave.cc") $sid = OMNI;
else if ($_SERVER['HTTP_HOST'] == "all.rainwave.cc") $sid = OMNI;
// An override, mostly for administration uses
if (isset($_GET['site'])) {
	if ($_GET['site'] == "rw") $sid = RW;
	else if ($_GET['site'] == "oc") $sid = OCR;
	else if ($_GET['site'] == "mw") $sid = VW;
	else if ($_GET['site'] == "vw") $sid = VW;
	else if ($_GET['site'] == "bit") $sid = BIT;
	else if ($_GET['site'] == "omni") $sid = OMNI;
}
// And a final override for when $_GET cannot be used or modified!
if (defined('SITEOVERRIDE')) $sid = SITEOVERRIDE;

setcookie("r3sid", $sid, time()+60*60*24*30, "/", ".rainwave.cc");

$pagestart = microtime(true);

require_once('/var/www/rainwave.cc/forums/config.php');

define('IN_PHPBB',true);
$phpbb_root_path = "/var/www/rainwave.cc/forums/";
$phpEx = substr(strrchr(__FILE__, '.'), 1);
include($phpbb_root_path . 'common.' . $phpEx);
$output = array();
$lastoutput = array();

define("RW_SID", $sid);
define("RW_DBPREFIX", "rw_");

define("TBL_ADS", RW_DBPREFIX . "ads");
define("TBL_ALBUMS", RW_DBPREFIX . "albums");
define("TBL_ARTISTS", RW_DBPREFIX . "artists");
define("TBL_SONGS", RW_DBPREFIX . "songs");
define("TBL_SONGRATINGS", RW_DBPREFIX . "songratings");
define("TBL_ALBUMRATINGS", RW_DBPREFIX . "albumratings");
define("TBL_COMMANDS", RW_DBPREFIX . "commands");
define("TBL_REQUESTS", RW_DBPREFIX . "requests");
define("TBL_SONG_ARTIST", RW_DBPREFIX . "song_artist");
define("TBL_SCHEDULE", RW_DBPREFIX . "schedule");
define("TBL_AD_SETS", RW_DBPREFIX . "ad_sets");
define("TBL_AD_SET_CONTENTS", RW_DBPREFIX . "ad_set_contents");
define("TBL_ELECTIONS", RW_DBPREFIX . "elections");
define("TBL_OA_CAT", RW_DBPREFIX . "oa_categories");
define("TBL_SONG_OA_CAT", RW_DBPREFIX . "song_oa_cat");
define("TBL_PLAYLISTS", RW_DBPREFIX . "playlists");
define("TBL_PLAYLIST_SONGS", RW_DBPREFIX . "playlist_songs");
define("TBL_ONESHOT", RW_DBPREFIX . "oneshot");
define("TBL_REQUEST_QUEUE", RW_DBPREFIX . "request_queue");
define("TBL_LISTENERS", RW_DBPREFIX . "listeners");
define("TBL_LISTENERHISTORY", RW_DBPREFIX . "listenerhistory");
define("TBL_LISTENERSTATS", RW_DBPREFIX . "listenerstats");
define("TBL_VOTEHISTORY", RW_DBPREFIX . "votehistory");
define("TBL_ALBUMFAVOURITES", RW_DBPREFIX . "albumfavourites");
define("TBL_SONGFAVOURITES", RW_DBPREFIX . "songfavourites");
define("TBL_APIKEYS", RW_DBPREFIX . "apikeys");

define("SCHED_ELEC", 0);
define("SCHED_ADSET", 1);
define("SCHED_JINGLE", 2);
define("SCHED_LIVE", 3);
define("SCHED_ONESHOT", 4);
define("SCHED_PLAYLIST", 5);
define("SCHED_PAUSE", 6);
define("SCHED_DJ", 7);

define("FIELDS_ALLALBUM", TBL_ALBUMS . ".album_id, " . TBL_ALBUMS . ".sid, album_name, album_lastplayed, album_rating_avg AS album_rating_avg, album_rating_count, album_totalrequests, album_totalvotes, album_lowest_oa, album_timesplayed, album_timeswon, album_timesdefeated");
define("FIELDS_LIGHTALBUM", TBL_ALBUMS . ".album_id, album_name, album_rating_avg");
define("FIELDS_ALLSONG", TBL_SONGS . ".song_id, " . TBL_SONGS . ".sid, song_title, song_secondslong, song_available, song_timesdefeated, song_timeswon, song_timesplayed, song_addedon, song_releasetime, song_lastplayed, song_rating_avg AS song_rating_avg, song_rating_count, song_totalvotes, song_totalrequests, song_url, song_urltext");
define("FIELDS_LIGHTSONG", TBL_SONGS . ".song_id, song_title, song_secondslong, song_rating_avg AS song_rating_avg");
define("FIELDS_ALLARTIST", TBL_ARTISTS . ".artist_id, artist_name, artist_lastplayed");
define("FIELDS_ALLAD", TBL_ADS . ".ad_id, ad_title, ad_album, ad_artist, ad_genre, ad_comment, ad_secondslong, ad_url, ad_url_text");

define("QR_SERVICE", "http://chart.apis.google.com/chart?cht=qr&chs=350x350&chl=%s");
define("MINI_QR_SERVICE", "http://chart.apis.google.com/chart?cht=qr&chs=50x50&chl=%s");

$user->session_begin();
$auth->acl($user->data);
$userdata =& $user->data;
$user_id =& $userdata['user_id'];
$username =& $userdata['username'];
$user_listen_key = getListenKey();
	
//-------------------------------------------------------------------------------------------------------

function cleanUp() {
	if (!$GLOBALS['db']->sql_close()) print "Error closing phpBB DB link.";
}

function db_single($sql) {
	$result = $GLOBALS['db']->sql_query($sql);
	$firstrow = $GLOBALS['db']->sql_fetchrow($result);
	$toreturn = "";
	if (is_array($firstrow)) $toreturn = $firstrow[key($firstrow)];
	$GLOBALS['db']->sql_freeresult($result);
	return $toreturn;
}

function db_row($sql) {
	$result = $GLOBALS['db']->sql_query($sql);
	$toreturn = $GLOBALS['db']->sql_fetchrow($result);
	$GLOBALS['db']->sql_freeresult($result);
	return $toreturn;
}

function db_table($sql) {
	$result = $GLOBALS['db']->sql_query($sql);
	$set = array();
	while ($row = $GLOBALS['db']->sql_fetchrow($result)) {
		$set[] = $row;
	}
	$GLOBALS['db']->sql_freeresult($result);
	return $set;
}

function db_update($sql) {
	$result = $GLOBALS['db']->sql_query($sql);
	$toreturn = $GLOBALS['db']->sql_affectedrows();
	$GLOBALS['db']->sql_freeresult($result);
	return $toreturn;
}

function sendGlobalSignal($refresh) {
	$r = new HttpRequest('http://localhost:6000/sync/1/update', HttpRequest::METH_GET);
	$r->setOptions(array('timeout' => 1));
	$r->send();
}

function sendUserSignal($user_id) {
	$ch = curl_init('http://localhost:6000/sync/user/' . $user_id);
	curl_setopt($ch, CURLOPT_TIMEOUT, 1);
	curl_exec($ch);
	curl_close($ch);
}

function sendIPSignal($ip_address) {
	$ch = curl_init('http://localhost:6000/sync/ip/' . $ip_address);
	curl_setopt($ch, CURLOPT_TIMEOUT, 1);
	curl_exec($ch);
	curl_close($ch);
}

function getCurrentElecSchedID() {
	return db_single("SELECT sched_id FROM " . TBL_SCHEDULE . " WHERE sched_used != 0 AND sched_type = 0 ORDER BY sched_actualtime DESC LIMIT 1");
}

function addOutput($class, $data, $last = false, $first = false) {
	if ($last) array_push($GLOBALS['lastoutput'], array("class" => $class, "data" => $data));
	else if ($first) array_unshift($GLOBALS['output'], array("class" => $class, "data" => $data));
	else array_push($GLOBALS['output'], array("class" => $class, "data" => $data));
}

function doOutput($basetime = 0) {
	$GLOBALS['output'] += $GLOBALS['lastoutput'];
	
	$lyre = array(
		"time" => time(),
		"exectime" => sprintf("%0.4f", microtime(true) - $GLOBALS['pagestart']),
		"queries" => $GLOBALS['db']->sql_num_queries()
		);
	if ($basetime != 0) $lyre['synctime'] = $basetime;
	addOutput("querystats", $lyre, false, true);

	print "[";
	$first = true;
	foreach($GLOBALS['output'] as $op) {
		if (!$first) print ",";
		print "{\"" . $op['class'] . "\":";
		print arrayToJSON($op['data']);
		$first = false;
		print "}";
	}
	print "]";
	$GLOBALS['output'] = array();
}

//-------------------------------------------------------------------------------------------------------

# Obtained from http://www.bin-co.com/php/scripts/array2json/
# This is useful because the default json_encode spits numbers out in quotes
# it also doesn't handle PostgreSQL's "t" and "f" for booleans 
function arrayToJSON(array $arr) {
	$parts = array();
	$is_list = false;

	if (count($arr) > 0) {
		// Find out if the given array is a numerical array
		$keys = array_keys($arr);
		$max_length = count($arr)-1;
		if (($keys[0] === 0) && ($keys[$max_length] === $max_length)) {//See if the first key is 0 and last key is length - 1
			$is_list = true;
			/*for($i=0; $i<count($keys); $i++) { //See if each key correspondes to its position
				if($i !== $keys[$i]) { //A key fails at position check.
					$is_list = false; //It is an associative array.
					break;
				}
			}*/
		}
			
		foreach($arr as $key=>$value) {
			$str = ( !$is_list ? '"' . $key . '":' : '' );
			if(is_array($value)) {
				$parts[] = $str . arrayToJSON($value);
			} else {
				if (is_numeric($value)){
					$str .= $value;
				} elseif(is_bool($value)) {
					$str .= ( $value ? 'true' : 'false' );
				} elseif( $value === null ) {
					$str .= 'null';
				} elseif ( $value === "t" ) {
					$str .= 'true';
				} elseif ( $value === "f" ) {
					$str .= 'false';
				} else {
					$value = str_replace("\\", "\\\\", $value);
					$value = str_replace("\"", "\\\"", $value);
					$value = str_replace("/", "\\/", $value);
					$str .= '"' . $value . '"';
				}
				$parts[] = $str;
			}
		}
	}
	$json = implode(',',$parts);

	if($is_list) return '[' . $json . ']';//Return numerical JSON
	return '{' . $json . '}';//Return associative JSON
}

function getListenKey() {
	if ($GLOBALS['user_id'] > 1) {
		$listenkey = $GLOBALS['userdata']['radio_listenkey'];
		if (($listenkey == "") || ($_GET['genkey'] == '1')) {
				$listenkey = md5(uniqid(rand(), true));
				$listenkey = substr($listenkey, 0, 10);
				db_update("UPDATE phpbb_users SET radio_listenkey = '" . $listenkey . "' WHERE user_id = " . $GLOBALS['user_id']);
				$GLOBALS['userdata']['radio_listenkey'] = $listenkey;
		}
		return "?" . $GLOBALS['user_id'] . ":" . $listenkey;
	}
	return "";
}

function newAPIKey($rw = false) {
	$key = md5(uniqid(rand(), true));
	$key = substr($key, 0, 10);
	if ($GLOBALS['user_id'] == 1) {
		$c = db_single("SELECT COUNT(*) FROM " . TBL_APIKEYS . " WHERE user_id = 1 AND api_ip = '" . $_SERVER['REMOTE_ADDR'] . "'");
		if ($c == 0) {
			db_update("INSERT INTO " . TBL_APIKEYS . " (user_id, api_ip, api_key, api_isrw) VALUES (" . $GLOBALS['user_id'] . ", '" . $_SERVER['REMOTE_ADDR'] . "', '" . $key . "', " . ($rw ? "TRUE" : "FALSE") . ")");
		}
		else {
			db_update("UPDATE " . TBL_APIKEYS . " SET api_key = '" . $key . "' WHERE user_id = 1 AND api_ip = '" . $_SERVER['REMOTE_ADDR'] . "'");
		}
	}
	else if ($rw) {
		$c = db_single("SELECT api_key FROM " . TBL_APIKEYS . " WHERE user_id = " . $GLOBALS['user_id'] . " AND api_isrw = TRUE");
		if ($c) {
			return $c;
			//db_update("UPDATE " . TBL_APIKEYS . " SET api_key = '" . $key . "' WHERE user_id = " . $GLOBALS['user_id'] . " AND api_isrw = TRUE");
		}
		else {
			db_update("INSERT INTO " . TBL_APIKEYS . " (user_id, api_ip, api_key, api_isrw, api_expiry) VALUES (" . $GLOBALS['user_id'] . ", '" . $_SERVER['REMOTE_ADDR'] . "', '" . $key . "', " . ($rw ? "TRUE" : "FALSE") . ", 0)");
		}
	}
	else {
		// same query again
		db_update("INSERT INTO " . TBL_APIKEYS . " (user_id, api_ip, api_key, api_isrw, api_expiry) VALUES (" . $GLOBALS['user_id'] . ", '" . $_SERVER['REMOTE_ADDR'] . "', '" . $key . "', " . ($rw ? "TRUE" : "FALSE") . ", 0)");
	}
	
	return $key;
}
