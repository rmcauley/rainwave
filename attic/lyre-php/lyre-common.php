<?php

$pagestart = microtime(true);

define("LYRE_VERSION", 0.1);

require_once('/var/www/substream.rainwave.cc/forums/config.php' );
define('IN_PHPBB',true);
$phpbb_root_path = "/var/www/substream.rainwave.cc/forums/";
$phpEx = substr(strrchr(__FILE__, '.'), 1);
include($phpbb_root_path . 'common.' . $phpEx);

$memcached = new Memcache;
$memcached->pconnect('localhost', 11211);

define("RW", 1);
define("OCR", 2);
define("VW", 3);

$sid = RW;
if ($_COOKIE['r3sid'] == "1") $sid = RW;
else if ($_COOKIE['r3sid'] == "2") $sid = OCR;
else if ($_COOKIE['r3sid'] == "3") $sid = VW;
// This gives precedence to URL if using a subdomained station
if ($_SERVER['HTTP_HOST'] == "rw.rainwave.cc") $sid = RW;
else if ($_SERVER['HTTP_HOST'] == "ocr.rainwave.cc") $sid = OCR;
else if ($_SERVER['HTTP_HOST'] == "vwave.rainwave.cc") $sid = VW;
// An override, mostly for administration uses
if ($_GET['site'] == "rw") $sid = RW;
else if ($_GET['site'] == "oc") $sid = OCR;
else if ($_GET['site'] == "vw") $sid = VW;
// And a final override for when $_GET cannot be used or modified!
if (defined(SITEOVERRIDE)) $sid = SITEOVERRIDE;

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

$xmlkeys = array(
	"song_data_entry" => "song",
	"artists_entry" => "artist",
	"album_list_entry" => "album",
	"all_requests_entry" => "request",
	"sched_next_entry" => "sched_event",
	"sched_history_entry" => "sched_event",
	"playlistalbums_entry" => "album"
	);

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

function setMemcache($key, $val) {
	if (!$GLOBALS['memcached']->replace($key, $val)) {
		if (!$GLOBALS['memcached']->set($key, $val, 0)) {
			print "ERROR: Could not set $key.\n";
		}
	}
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

//-------------------------------------------------------------------------------------------------------

function loadEvent($sched_id, $light = true) {
	$fields_song = $light ? FIELDS_LIGHTSONG : FIELDS_ALLSONG;
	$fields_album = $light ? FIELDS_LIGHTALBUM : FIELDS_ALLALBUM;
	$event = db_row("SELECT " . TBL_SCHEDULE . ".* FROM " . TBL_SCHEDULE . " WHERE sched_id = " . $sched_id);
	if ($event['user_id'] == null) unset($event['user_id']);
	else $event['username'] = db_single("SELECT username FROM " . USERS_TABLE . " WHERE user_id = " . $event['user_id']);
	if ($event['sched_length'] == 0) unset($event['sched_length']);
	if ($event['sched_type'] == SCHED_ELEC) {
		$latest_elec = db_table("SELECT elec_entry_id, elec_isrequest, elec_position, elec_votes, " . $fields_song . ", " . $fields_album . " FROM " . TBL_ELECTIONS . " JOIN " . TBL_SONGS . " USING (song_id) JOIN " . TBL_ALBUMS . " USING (album_id) WHERE sched_id = " . $sched_id . " ORDER BY elec_position");
		$event['song_data'] = $latest_elec;
	}
	else if ($event['sched_type'] == SCHED_ADSET) {
		$latest_ad = array();
		$latest_adset = db_row("SELECT adset_id, adset_position FROM " . TBL_AD_SETS . " WHERE sched_id = " . $sched_id);
		$adset = db_table("SELECT " . FIELDS_ALLAD . ", ad_position FROM " . TBL_AD_SETS . " JOIN " . TBL_AD_SET_CONTENTS . " USING (adset_id) JOIN " . TBL_ADS . " USING (ad_id) WHERE adset_id = " . $latest_adset['adset_id'] . " AND ad_verified = TRUE ORDER BY ad_position ASC");
		if ($adset[0]['ad_genre'] == "intro") {
			$intro = array_shift($adset);
			$adset[0]['ad_secondslong'] += $intro['ad_secondslong'];
			if ($latest_adset['adset_position'] <= 2) $latest_adset['adset_position'] = 1;
			else $latest_adset['adset_position']--;
		}
		if ($adset[count($adset) - 1]['ad_genre'] == "outro") {
			$outro = array_pop($adset);
			$adset[count($adset) - 1]['ad_secondslong'] += $outro['ad_secondslong'];
			if ($latest_adset['adset_position'] > count($adset)) $latest_adset['adset_position'] = count($adset);
		}
		$latest_adset['adset_position']--;
		$latest_adset['ad_data'] = $adset;
		$event = array_merge($event, $latest_adset);
	}
	else if ($event['sched_type'] == SCHED_JINGLE) {
		$latest_jingle = db_row("SELECT " . FIELDS_ALLAD . " FROM " . TBL_ADS . " WHERE ad_genre = 'jingle' ORDER BY ad_lastplayed DESC LIMIT 1");
		$event['ad_data'] = $latest_jingle;
	}
	else if (($event['sched_type'] == SCHED_LIVE) || ($event['sched_type'] == SCHED_DJ)) {
		$event['username'] = db_single("SELECT username FROM " . USERS_TABLE . " WHERE user_id = " . $event['user_id']);
	}
	else if ($event['sched_type'] == SCHED_ONESHOT) {
		$songdata = db_table("SELECT " . $fields_song . ", " . $fields_album . " FROM " . TBL_ONESHOT . " JOIN " . TBL_SONGS . " USING (song_id) JOIN " . TBL_ALBUMS . " USING (album_id) WHERE " . TBL_ONESHOT . ".sched_id = " . $event['sched_id']);
		$event['song_data'] = $songdata;
	}
	else if ($event['sched_type'] == SCHED_PLAYLIST) {
		$playlist = db_row("SELECT playlist_id, playlist_name, playlist_position FROM " . TBL_PLAYLISTS . " WHERE sched_id = " . $sched_id);
		$event = array_merge($event, $playlist);
		$event['playlist_length'] = db_single("SELECT COUNT(*) FROM " . TBL_PLAYLIST_SONGS . " WHERE playlist_id = " . $playlist['playlist_id']);
		$songdata = db_table("SELECT " . $fields_song . ", " . $fields_album . " FROM " . TBL_PLAYLIST_SONGS . " JOIN " . TBL_SONGS . " USING (song_id) JOIN " . TBL_ALBUMS . " USING (album_id) WHERE playlist_id = " . $playlist['playlist_id'] . " AND playlist_position >= " . $playlist['playlist_position'] . " ORDER BY playlist_position LIMIT 3");
		$event['song_data'] = $songdata;
	}
	if (isset($event['song_data']) && ($event['song_data'][0]['song_id'] > 0))  {
		for ($i = 0; $i < count($event['song_data']); $i++) {
			$event['song_data'][$i]['artists'] = db_table("SELECT " . TBL_ARTISTS . ".artist_id, artist_name FROM " . TBL_SONG_ARTIST . " JOIN " . TBL_ARTISTS . " USING (artist_id) WHERE song_id = " . $event['song_data'][$i]['song_id']);
			if (isset($event['song_data'][$i]['elec_isrequest'])) {
				if ($event['song_data'][$i]['elec_isrequest'] == 1) {
					$event['song_data'][$i]['song_requestor'] = db_single("SELECT username FROM " . TBL_REQUESTS . " JOIN " . USERS_TABLE . " USING (user_id) WHERE song_id = " . $event['song_data'][$i]['song_id'] . " ORDER BY request_fulfilled_at DESC LIMIT 1");
				}
				else if ($event['song_data'][$i]['elec_isrequest'] != 0) {
					$event['song_data'][$i]['song_requestor'] = db_single("SELECT username FROM " . TBL_REQUEST_QUEUE .  " JOIN " . TBL_SONGS . " USING (song_id) JOIN " . USERS_TABLE . " ON (" . TBL_REQUEST_QUEUE . ".user_id = " . USERS_TABLE . ".user_id) WHERE album_id = " . $event['song_data'][$i]['album_id'] . " ORDER BY requestq_id ASC LIMIT 1");
				}
			}
		}
		if (!$light) {
			$event['song_data'][0]['song_rank'] = db_single("SELECT COUNT(song_id) FROM " . TBL_SONGS . " WHERE song_rating_avg > " . $event['song_data'][0]['song_rating_avg'] . " OR (song_rating_avg = " . $event['song_data'][0]['song_rating_avg'] . " AND song_rating_count > " . $event['song_data'][0]['song_rating_count'] . ")") + 1;
			$event['song_data'][0]['album_rank'] = db_single("SELECT COUNT(album_id) FROM " . TBL_ALBUMS . " WHERE album_rating_avg >   " . $event['song_data'][0]['album_rating_avg'] . " OR (album_rating_avg = " . $event['song_data'][0]['album_rating_avg'] . " AND album_rating_count > " . $event['song_data'][0]['album_rating_count'] . ")") + 1;
		}
	}
	return $event;
}

//-------------------------------------------------------------------------------------------------------

function setRequests() {
	$lineup = db_table("SELECT request_id, username AS request_username, " . TBL_REQUESTS . ".user_id AS request_user_id, request_expires_at, request_tunedin_expiry FROM " . TBL_REQUESTS . " JOIN " . USERS_TABLE . " USING (user_id) WHERE " . TBL_REQUESTS . ".sid = " . $GLOBALS['sid'] . " AND request_fulfilled_at = 0 ORDER BY request_id ASC LIMIT 10");
	for ($i = 0; $i < count($lineup); $i++) {
		$req = db_table("SELECT " . FIELDS_LIGHTSONG . ", " . FIELDS_LIGHTALBUM . " FROM " . TBL_REQUEST_QUEUE . " JOIN " . TBL_SONGS . " USING (song_id) JOIN " . TBL_ALBUMS . " USING (album_id) WHERE " . TBL_SONGS . ".sid = " . $GLOBALS['sid']. " AND song_available = true ORDER BY requestq_order ASC LIMIT 1");
		if (count($req) > 0) {
			$lineup[$i]['request'] = $req[0];
		}
	}
	setMemcache($GLOBALS['sid'] . "_all_requests", $lineup);
}

//-------------------------------------------------------------------------------------------------------

function addOutput($class, $data, $last = false, $first = false) {
	if ($last) array_push($GLOBALS['lastoutput'], array("class" => $class, "data" => $data));
	else if ($first) array_unshift($GLOBALS['output'], array("class" => $class, "data" => $data));
	else array_push($GLOBALS['output'], array("class" => $class, "data" => $data));
}

function doOutput($basetime = 0) {
	$GLOBALS['output'] += $GLOBALS['lastoutput'];
	
	$lyre = array(
		"version" => LYRE_VERSION,
		"time" => time(),
		"exectime" => sprintf("%0.4f", microtime(true) - $GLOBALS['pagestart']),
		"queries" => $GLOBALS['db']->sql_num_queries()
		);
	if ($basetime != 0) $lyre['synctime'] = $basetime;
	addOutput("lyre", $lyre, false, true);

	if (isset($_GET['xml'])) {
		$xml = 0;
		openXML($xml, $basetime);
		foreach ($GLOBALS['output'] as $op) {
			arrayToXML($xml, $op['class'], $op['data']);
		}
		closePrintXML($xml);
	}
	else {
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
	}
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

//-------------------------------------------------------------------------------------------------------

function openXML(&$xml) {
	$xml = new XmlWriter();
	$xml->openMemory();
	$xml->startDocument('1.0', 'UTF-8');
	$xml->startElement("lyreupdate");
}

function closePrintXML(&$xml) {
        $xml->endElement();

        print $xml->outputMemory(true);
}

function arrayToXML(&$xml, $class, $data) {
	$xml->startElement($class);
	foreach ($data as $key => $value) {
		if (is_array($value)) {
			$useclass = $key;
			if (preg_match("/^\d+$/", $key)) $useclass = $class . "_entry";
			if (isset($GLOBALS['xmlkeys'][$useclass])) $useclass = $GLOBALS['xmlkeys'][$useclass];
			arrayToXML($xml, $useclass, $value);
		}
		else {
			$usekey = $key;
			//$repet = strpos($key, $class . "_");
			//if ($repet === 0) $usekey = substr($key, strlen($class) + 1);
			if ($value == "f") $value = "true";
			if ($value == "t") $value = "false";
			$xml->writeElement($usekey, "$value");
		}
	}
	$xml->endElement();
}

//-------------------------------------------------------------------------------------------------------

function updateNextEvents() {
	$ne = array();
	$fwd = db_table("SELECT " . TBL_SCHEDULE . ".* FROM " . TBL_SCHEDULE . " WHERE sid = " . $GLOBALS['sid'] . " AND sched_used = 0 AND (sched_starttime > " . (time() - 600) . " OR sched_starttime = 0) ORDER BY sched_starttime ASC, sched_id ASC");
	$eleccount = 0;
	for ($i = 0; ($i < count($fwd)) && ($eleccount < 2); $i++) {
		if ($fwd[$i]['sched_starttime'] >= (time() + 720)) break;
		$ne[] = array_merge($fwd[$i], loadEvent($fwd[$i]['sched_id']));
		if ($fwd[$i]['sched_type'] == 0) $eleccount++;
	}
	for ($i = 0; $i < count($ne); $i++) {
		if (($ne[$i]['sched_type'] == SCHED_ADSET) && ($i > 0)) {
			$ne[$i - 1]['sched_starttime'] += 15;
			$ad = array_splice($ne, $i, 1);
			$after = array_splice($ne, $i - 1);
			$ne = array_merge($ne, $ad, $after);
			break;
		}
	}
	setMemcache($GLOBALS['sid'] . "_next_events", $ne);
}

//-------------------------------------------------------------------------------------------------------

function updateLiveShows($override = false) {
	$stime = time() - strtotime("today") - (86400 * 2);
	if ($override || ($stime != $GLOBALS['memcached']->get("live_schedule_stime"))) {
		$etime = time() + strtotime("tomorrow") + (86400 * 7);	
		setMemcache("live_schedule", db_table("SELECT " . TBL_SCHEDULE . ".*, username FROM " . TBL_SCHEDULE . " JOIN " . USERS_TABLE . " USING (user_id) WHERE (sched_starttime >= " . $stime . " AND sched_starttime <= " . $etime . ") AND (sched_type = " . SCHED_LIVE . " OR sched_type = " . SCHED_DJ . ") ORDER BY sched_starttime"));
		setMemcache("live_schedule_stime", $stime);
		setMemcache("live_schedule_update", 0);
	}
}