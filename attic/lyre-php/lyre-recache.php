<?php

require("lyre-common.php");

print "$sid :: ";

// Current event
print "Current : ";
$lastoffset = 0;
$ce = db_row("SELECT " . TBL_SCHEDULE . ".* FROM " . TBL_SCHEDULE . " WHERE sched_used != 0 ORDER BY sched_actualtime DESC LIMIT 1");
$ce['sched_paused'] = false;
$ce = array_merge($ce, loadEvent($ce['sched_id'], false));
$cce = $memcached->get($GLOBALS['sid'] . "_current_event");
if (isset($_GET['override'])) {
	// do nothing, we want to let execution continue
}
else if (($ce['sched_type'] == SCHED_ELEC) || ($ce['sched_type'] == SCHED_LIVE) || ($ce['sched_type'] == SCHED_ONESHOT)) {
	if ($ce['sched_id'] == $cce['sched_id']) {
		print "Elec/Live/Oneshot Rules: No schedule ID change!";
		cleanUp();
		exit(0);
	}
	// Prevents active time from ever being counted twice for the current election - even if we override an update.
	if ($ce['sched_type'] == SCHED_ELEC) {
		print "A. Time : " ;
		db_update("START TRANSACTION");
		db_update("UPDATE " . USERS_TABLE . " SET radio_usetime = radio_usetime + " . $ce['song_data'][0]['song_secondslong'] . " FROM " . TBL_VOTEHISTORY . ", " . TBL_LISTENERS . " WHERE " . TBL_VOTEHISTORY . ".sched_id = " . $ce['sched_id'] . " AND " . TBL_VOTEHISTORY . ".user_id = " . TBL_LISTENERS . ".user_id AND " . TBL_LISTENERS . ".user_id = " . USERS_TABLE . ".user_id");
		db_update("UPDATE " . TBL_LISTENERS . " SET list_active = TRUE FROM " . TBL_VOTEHISTORY . " WHERE " . TBL_VOTEHISTORY . ".sched_id = " . $ce['sched_id'] . " AND " . TBL_VOTEHISTORY . ".user_id = " . TBL_LISTENERS . ".user_id");
		db_update("COMMIT");
	}
}
else if ($ce['sched_type'] == SCHED_JINGLE) {
	print "No action on jingles.";
	cleanUp();
	exit(0);
}
else if ($ce['sched_type'] == SCHED_PAUSE) {
	if (!isset($cce['sched_paused']) || !$cce['sched_paused']) {
		print "Pausing.";
		$cce['sched_paused'] = true;
		setMemcache($sid . "_current_event", $cce);
	}
	else {
		print "Already paused.";
	}
	cleanUp();
	exit(0);
}
else if ($ce['sched_type'] == SCHED_DJ) {
	print "ERROR: DJ events should never show up!";
	cleanUp();
	exit(0);
}
$songlen = 0;
if (isset($ce['sched_length'])) $songlen = $ce['sched_length'];
if (isset($ce['song_data'][0]['song_secondslong'])) $songlen = $ce['song_data'][0]['song_secondslong'];
else if (isset($ce['ad_data'][0]['ad_secondslong'])) {
	// Adjusts the perceived start of the ad for clients, so that actualtime + songlen reaches
	// the end of *this* particular ad.  (otherwise the station would appear offline)
	for ($i = 0; ($i < $ce['adset_position']) && ($i < (count($ce['ad_data']) - 1)); $i++) {
		$ce['sched_actualtime'] += $ce['ad_data'][$i]['ad_secondslong'];
	}
	$songlen = $ce['ad_data'][$ce['adset_position']]['ad_secondslong'];
}
else if (isset($ce['sched_length']) && ($ce['sched_length'] > 0)) $songlen = $ce['sched_length'];
if ($memcached->get($sid . "_current_dj") > 0) {
	print "Current Has DJ : ";
	$ce['sched_dj'] = db_single("SELECT username FROM " . USERS_TABLE . " WHERE user_id = " . $memcached->get($sid . "_current_dj"));
}
$ce['sched_endtime'] = $ce['sched_actualtime'] + $songlen;
setMemcache($sid . "_current_event", $ce);
if ($ce['sched_used'] == 2) $lastoffset = 1;

// Next events
print "Next : ";
updateNextEvents();

// Last events
print "Last : ";
$le = array();
$back = db_table("SELECT " . TBL_SCHEDULE . ".* FROM " . TBL_SCHEDULE . " WHERE sched_used = 2 AND sched_type != " . SCHED_JINGLE . " AND sched_type != " . SCHED_PAUSE . " AND sched_type != " . SCHED_DJ . " ORDER BY sched_actualtime DESC LIMIT 3 OFFSET " . $lastoffset);
for ($i = 0; $i < count($back); $i++) {
	$le[] = array_merge($back[$i], loadEvent($back[$i]['sched_id']));
}
//$adtest = false;
//db_row("SELECT " . TBL_SCHEDULE . ".* FROM " . TBL_SCHEDULE . " WHERE sched_used = 2 AND sched_type = " . SCHED_ADSET . " ORDER BY sched_actualtime DESC LIMIT 1", $adtest);
//array_unshift($le, array_merge($adtest, loadEvent($adtest['sched_id'])));
setMemcache($sid . "_last_events", $le);

// Playlist update
print "Albums : ";
$listupd = db_table("SELECT " . FIELDS_LIGHTALBUM . ", album_lowest_oa FROM " . TBL_ALBUMS . " WHERE album_rowupdated > " . (time() - (time() - $le[0]['sched_actualtime']) + 20) . " AND album_verified = TRUE");
setMemcache($sid . "_album_list_update", $listupd);

print "Req : ";
setRequests();
// print "RequestQ : ";
// processRequestQueue();

$req = false;

$dj = db_single("SELECT user_id FROM " . TBL_SCHEDULE . " WHERE sched_type = " . SCHED_DJ . " AND (sched_starttime - 300) <= " . time() . " AND (sched_starttime + sched_length + 300) >= " . time() . " ORDER BY sched_starttime DESC");
if ($dj > 0) {
	print "DJ On : ";
	setMemcache($sid . "_current_dj", $dj);
}
else {
	print "No DJ : ";
	setMemcache($sid . "_current_dj", 0);
}

print "Live : ";
updateLiveShows(isset($_GET['override']));
if ($memcached->get("live_schedule_update") < 2) { 
	setMemcache("live_schedule_update", $memcached->get("live_schedule_update") + 1);
}

print "Done!";

sendGlobalSignal("full");

cleanUp();

?>
