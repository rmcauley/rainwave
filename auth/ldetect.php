<?php
// Listener Detect Script Common Functions for Rainwave 3
// Uses Icecast Listener Authentication scheme
// Sample Icecast get information:
//   &server=myserver.com&port=8000&client=1&mount=/live&user=&pass=&ip=127.0.0.1&agent="My%20player"

$passacl = 0;
$ice_server = "Unknown";
if ($_SERVER['REMOTE_ADDR'] == "69.16.138.218") {
	$passacl = 1;
	define("POST_SERVER", "Dracoirs");
}
else if ($_SERVER['REMOTE_ADDR'] == "76.10.173.231") {
	$passacl = 1;
	define("POST_SERVER", "Rainwave Beta");
}
else if (($_SERVER['REMOTE_ADDR'] == "127.0.0.1") || ($_SERVER['REMOTE_ADDR'] == "::1")) {
	$passacl = 1;
	define("POST_SERVER", "Rainwave");
}
else if ($_SERVER['REMOTE_ADDR'] == "213.67.132.98") {
	$passacl = 1;
	define("POST_SERVER", "Ormgas");
}
else if ($_SERVER['REMOTE_ADDR'] == "69.94.104.182") {
	$passacl = 1;
	define("POST_SERVER", "Lyfe");
}

if ($passacl == 2) {
	header("icecast-auth-user: 0");
	header("icecast-auth-message: relay " . $_SERVER['REMOTE_ADDR'] . " does not pass ACL");
	print "Relay " . $_SERVER['REMOTE_ADDR'] . " does not pass ACL.";
	exit(0);
}

// Our moint point determines our site.
if (!isset($_REQUEST['mount'])) {
	header("icecast-auth-user: 0");
	header("icecast-auth-message: no mount specified");
	print "No mountpoint specified.";
	exit(0);
}

// Grab the user/key combo from the mount point
if (preg_match("/\?\d+:[\d\w]+$/", $_REQUEST['mount'])) {
	$temp1 = split("\?", $_REQUEST['mount'], 2);
	$temp2 = split(":", $temp1[1], 2);
	define("POST_MOUNT", $temp1[0]);
	define("POST_USER", $temp2[0]);
	// Sanity check the user ID.
	if (!preg_match("/^\d+$/", POST_USER)) {
		header("icecast-auth-user: 0");
		header("icecast-auth-message: invalid user id specified");
		print "Invalid user ID specified";
		exit(0);
	}
	define("POST_PASS", $temp2[1]);
	// Sanity check the key.
	if (!preg_match("/^[\d\w]+$/", POST_PASS)) {
		header("icecast-auth-user: 0");
		header("icecast-auth-message: invalid key specified");
		print "Invalid key specified";
		exit(0);
	}
}
// Anonymous user tuning in
else {
	$temp1 = split("\?", $_REQUEST['mount'], 2);
	define("POST_MOUNT", $temp1[0]);
	define("POST_USER", 1);
	define("POST_PASS", "");
}

// Sanity check the mount point.
if (!preg_match("/^\/[\w\d.]+$/", POST_MOUNT)) {
	header("icecast-auth-user: 0");
	header("icecast-auth-message: invalid mount specified " . POST_MOUNT);
	print "Invalid mount specified . " . POST_MOUNT . ".";
	exit(0);
}

// Load our DB interface here
require("common.php");

// Make sure the user we are trying to use exists.
if (db_single("SELECT COUNT(*) FROM " . USERS_TABLE . " WHERE user_id = " . POST_USER) == 0) {
	header("icecast-auth-user: 0");
	header("icecast-auth-message: invalid user");
	print "User ID does not exist.";
	cleanUp(false);
	exit(0);
}

// We need an Icecast client ID in order to do any action at all
if (!preg_match("/^\d+$/", $_REQUEST['client'])) {
	header("icecast-auth-user: 0");
	header("icecast-auth-message: invalid client ID");
	print "Invalid client ID.";
	cleanUp(false);
	exit(0);
}

if (($_REQUEST['action'] == "listener_add") && !preg_match("/^\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b$/", $_REQUEST['ip'])) {
	header("icecast-auth-user: 0");
	header("icecast-auth-message: invalid ip");
	print "Invalid IP.";
	cleanUp(false);
	exit(0);
}

define("POST_IP", $_REQUEST['ip']);
define("POST_SERVER", $_REQUEST['server']);
define("POST_ACTION", $_REQUEST['action']);
define("POST_ICEID", $_REQUEST['client']);

if (isset($_REQUEST['duration']) && preg_match("/^\d+$/", $_REQUEST['duration'])) {
	define("POST_DURATION", $_REQUEST['duration']);
}
else {
	define("POST_DURATION", 0);
}

$debuginfo = "user=" . POST_USER . "&pass=" . POST_PASS . "&mount=" . POST_MOUNT . "&sid=" . $sid . "&ip=" . POST_IP . "&server=" . POST_SERVER . "&action=" . POST_ACTION . "&client=" . POST_ICEID;
print $debuginfo . "\n";

// Regex test the user agent of the client, to make sure it's kosher.
if (preg_match("/foobar/i", $_REQUEST['agent'])) define(POST_AGENT, "foobar2000");
else if (preg_match("/winamp/i", $_REQUEST['agent'])) define(POST_AGENT, "Winamp");
else if (preg_match("/vlc/i", $_REQUEST['agent'])) define(POST_AGENT, "VLC");
else if (preg_match("/xine/i", $_REQUEST['agent'])) define(POST_AGENT, "xine/Amarok");
else if (preg_match("/fstream/i", $_REQUEST['agent'])) define(POST_AGENT, "FStream");
else if (preg_match("/bass/i", $_REQUEST['agent'])) define(POST_AGENT, "BASS/XMplay");
else if (preg_match("/xion/i", $_REQUEST['agent'])) define(POST_AGENT, "Xion");
else define(POST_AGENT, "Unknown");

header("icecast-auth-message: " . $debuginfo);

if (POST_ACTION == "listener_add") addListener();
if (POST_ACTION == "listener_remove") removeListener();

cleanUp(false);
exit(0);

function addListener() {
	if ((POST_USER > "") && (POST_PASS > "")) {
		// Check the key, if it's good, rock on.
		$key = db_single("SELECT radio_listenkey FROM " . USERS_TABLE . " WHERE user_id = " . POST_USER);
		$permissions = db_single("SELECT COUNT(*) FROM phpbb_user_group WHERE user_id = " . POST_USER . " AND (group_id = 7 OR group_id = 8)");
		if ($permissions < 1) {
			header("icecast-auth-user: 0");
			header("icecast-auth-message: not a donor or admin");
			print "You must be a donor to listen to Rainwave 3.";
		}
		else if ($key == POST_PASS) {
			// User is already tuned in.
			$existing = db_single("SELECT COUNT(*) FROM " . TBL_LISTENERS . " WHERE user_id = " . POST_USER);
			// If the user has an existing record
			if ($existing > 0) {
				// Update his existing record to match the new IP
				db_update("UPDATE " . TBL_LISTENERS . " SET sid = " . $GLOBALS['sid'] . ", list_purge = FALSE, list_icecast_id = " . POST_ICEID . ", list_relay = '" . POST_SERVER . "', list_agent = '" . POST_AGENT . "' WHERE user_id = " . POST_USER);
				header("icecast-auth-user: 1");
				header("icecast-auth-message: user record updated");
				print "User record updated.";			
			}
			else {
				$elec_sched_id = getCurrentElecSchedID();
				$list_active = db_single("SELECT COUNT(*) FROM " . TBL_VOTEHISTORY . " WHERE user_id = " . POST_USER . " AND sched_id = " . $elec_sched_id) > 0 ? "TRUE" : "FALSE";
				// User does not have an existing record, so we can insert a new one.
				db_update("INSERT INTO " . TBL_LISTENERS . " (sid, list_ip_address, user_id, list_relay, list_agent, list_icecast_id, list_active) VALUES (" . $GLOBALS['sid'] . ", '" . POST_IP . "', " . POST_USER . ", '" . POST_SERVER . "', '" . POST_AGENT . "', " . POST_ICEID . ", " . $list_active . ")");
				header("icecast-auth-user: 1");
				header("icecast-auth-message: user record added");
				print "User record added.";
			}
			if (db_single("SELECT COUNT(*) FROM " . TBL_REQUEST_QUEUE . " JOIN " . TBL_SONGS . " USING (song_id) WHERE sid = " . $GLOBALS['sid'] . " AND user_id = " . POST_USER) > 0)  {
				// Insert request if they aren't in line already
				if (db_single("SELECT COUNT(*) FROM " . TBL_REQUESTS . " WHERE user_id = " . POST_USER . " AND request_fulfilled_at = 0") == 0) {
					db_update("INSERT INTO " . TBL_REQUESTS . " (sid, user_id) VALUES (" . $GLOBALS['sid'] . ", " . POST_USER . ")");
					setRequests();
				}
				else if (db_single("SELECT COUNT(*) FROM " . TBL_REQUEST_QUEUE . " JOIN " . TBL_SONGS . " USING (song_id) WHERE sid = " . $GLOBALS['sid'] . " AND user_id = " . POST_USER . " AND song_available = TRUE")) {
					db_update("UPDATE " . TBL_REQUESTS . " SET request_tunedin_expiry = NULL WHERE user_id = " . POST_USER);
				}
			}			
			sendUserSignal(POST_USER);
		}
		else {
			header("icecast-auth-user: 0");
			header("icecast-auth-message: wrong key.");
			print "Wrong key.";
		}
	}
	else {
		// We always authenticate and add anonymous users
		//db_update("INSERT INTO " . TBL_LISTENERS . " (sid, list_ip_address, user_id, list_relay, list_agent, list_icecast_id) VALUES (" . $GLOBALS['sid'] . ", '" . POST_IP . "', 1, '" . POST_SERVER . "', '" . POST_AGENT . "', " . POST_ICEID . ")");
		header("icecast-auth-user: 0");
		header("icecast-auth-message: anonymous listeners cannot tune in to R3");
		print "Anonymous listeners cannot tune in to R3.";
		//sendIPSignal(POST_IP)
	}
}

function removeListener() {
	$listener = db_row("SELECT user_id, list_ip_address FROM " . TBL_LISTENERS . " WHERE list_icecast_id = " . POST_ICEID . " AND list_relay = '" . POST_SERVER . "'");
	//db_update("DELETE FROM " . TBL_LISTENERS . " WHERE list_icecast_id = " . POST_ICEID . " AND list_relay = '" . POST_SERVER . "'");
	db_update("UPDATE " . TBL_LISTENERS . " SET list_purge = TRUE WHERE list_icecast_id = " . POST_ICEID . " AND list_relay = '" . POST_SERVER . "'");
	header("icecast-auth-message: listener record removed");
	print "Listener record removed.";
	if ($listener['user_id'] > 1) sendUserSignal($listener['user_id']);
	else sendIPSignal($listener['ip_address']);
}

cleanUp(false);

?>
