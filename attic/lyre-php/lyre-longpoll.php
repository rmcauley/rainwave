<?php

if (isset($_GET['xml'])) header("Content-type: text/xml");
else header("Content-type: application/json");

if (!preg_match("/^\d+$/", $_GET['sid'])) {
	if (isset($_GET['xml'])) {
		print "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";  //fix for syntax highlight stupidity: <?
		print "<lyreupdate><error><code>1</code><text>Station ID is required. (" . $_SERVER['REMOTE_ADDR'] . ")</text></error></lyreupdate>";
	}
	else {
		print "[ { \"error\": { \"code\": 1, \"text\": \"Station ID is required.\" } } ]";
	}
	exit(0);
}

$refresh = "false";
$memcached = false;
if (isset($_GET['refresh'])) $refresh = $_GET['refresh'];
else {
	$memcached = new Memcache;
	$memcached->pconnect('localhost', 11211);
	
	$ce = false;
	if ($_GET['sid'] != 0) {
		$ce = $memcached->get($_GET['sid'] . "_current_event"); 
		if (($ce['sched_endtime'] < (time() - 10)) && ($ce['sched_endtime'] > 0) && !$ce['sched_paused']) {
			if (isset($_GET['xml'])) {
				print "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";  //fix for syntax highlight stupidity: <?
				print "<lyreupdate><error><code>2</code><text>Station offline. (" . $_SERVER['REMOTE_ADDR'] . ")</text></error></lyreupdate>";
			}
			else {
				print "[ { \"error\": { \"code\": 2, \"text\": \"Station is offline. (" . $ce['sched_paused'] . ")\" } } ]";
			}
		$memcached->close();
		exit(0);			
		}
	}
}
$basetime = 0;
$stated_id = 1;
if (isset($_GET['basetime']) && preg_match("/^\d+$/", $_GET['basetime'])) $basetime = $_GET['basetime'];
if (isset($_GET['user_id']) && preg_match("/^\d+$/", $_GET['user_id'])) $stated_id = $_GET['user_id'];
$runningtime = time();
while ($refresh == "false") {
	if ($memcached->get($_GET['sid'] . "sig_global_timestamp") > $basetime) {
		$refresh = $memcached->get($_GET['sid'] . "sig_global");
		$basetime = $memcached->get($_GET['sid'] . "sig_global_timestamp");
	}
	else if ($stated_id > 1) {
		$refresh = $memcached->get("lyresig_u" . $stated_id);
	}
	else {
		$refresh = $memcached->get("lyresig_i" . $_SERVER['REMOTE_ADDR']);
	}
	if ($refresh == "") $refresh = "false";
	if ($refresh == "false") {
		sleep(1);
		if ((time() - $runningtime) >= 45) $refresh = "none";
	}
	if ($memcached != false) {
		$ce = $memcached->get($_GET['sid'] . "_current_event");
		if (($ce['sched_endtime'] < (time() - 10)) && ($ce['sched_endtime'] > 0) && !$ce['sched_paused']) {
			if (isset($_GET['xml'])) {
				print "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";  //fix for syntax highlight stupidity: <?
				print "<lyreupdate><error><code>2</code><text>Station offline. (" . $_SERVER['REMOTE_ADDR'] . ")</text></error></lyreupdate>";
			}
			else {
				print "[ { \"error\": { \"code\": 2, \"text\": \"Station is offline.\" } } ]";
			}
		$memcached->close();
		exit(0);			
		}
	}
}

if ($refresh == "none") {
	if (isset($_GET['xml'])) {
		print "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";  //fix for syntax highlight stupidity: <?
		print "<lyreupdate><null>No update. (" . $_SERVER['REMOTE_ADDR'] . ")</null></lyreupdate>";
	}
	else {
		print "[ { \"null\": { \"text\": \"No update.\" } } ]";
	}
}
else {
	if (!isset($_GET['refresh'])) $memcached->close();

	require("lyre-common.php");
	require("lyre-web.php");
	
	if ($basetime == 0) $basetime = $memcached->get($sid . "sig_global_timestamp");

	if ($stated_id > 1) {
		if ($user_id != $stated_id) $refresh = "idtheft";
		else if ($refresh == "full") setMemcache("lyresig_u" . $user_id, "false");
	}
	
	if ($refresh == "user") {
		if ($user_id > 1) setMemcache("lyresig_u" . $user_id, "false");
		else setMemcache("lyresig_i" . $_SERVER['REMOTE_ADDR'], "false");
	}

	rw_atx($refresh);

	doOutput($basetime);
	cleanUp();
}

?>
