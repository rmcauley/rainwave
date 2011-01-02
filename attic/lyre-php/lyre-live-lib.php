<?php

function getLiveShows() {
	return $GLOBALS['memcached']->get("live_schedule");
}

function startLiveShow($sched_id) {
	if (!preg_match("/^\d+$/", $sched_id)) return -1;
	$sched_data = db_row("SELECT * FROM " . TBL_SCHEDULE . " WHERE sched_id = " . $sched_id);
	if ($sched_data['sched_used'] != 0) return -2;
	if ($sched_data['sched_type'] != SCHED_LIVE) return -3;
	if (($sched_data['user_id'] != $GLOBALS['user_id']) && ($GLOBALS['userdata']['radio_live_admin'] < 2)) return -4;
	if (db_update("UPDATE " . TBL_SCHEDULE . " SET sched_used = 1 WHERE sched_id = " . $sched_id) > 0) return 1;
	else return 0;
}

function addLiveShow($time, $name, $notes, $suser_id, $type, $length) {
	if (!preg_match("/^\d+$/", $time)) return -1;
	if (!preg_match("/^[A-Za-z0-9,.!\- ?]*$/", $name)) return -1;
	if (!preg_match("/^[A-Za-z0-9,.!\- ?]*$/", $notes)) return -1;
	if (!preg_match("/^\d+$/", $suser_id)) return -1;
	if (($type != SCHED_DJ) && ($type != SCHED_LIVE) && ($type != SCHED_PAUSE)) return -1;
	if (!preg_match("/^\d+$/", $length)) return -1;
	if (($type == SCHED_PAUSE) && ($GLOBALS['userdata']['radio_live_admin'] > 0)) {
		// ok!
	}
	else if ($GLOBALS['userdata']['radio_live_admin'] != 2) return -2;
	$sched_used = 0;
	if ($type == SCHED_DJ) $sched_used = 2;
	else if ($type == SCHED_PAUSE) {
		if (db_single("SELECT COUNT(*) FROM " . TBL_SCHEDULE . " WHERE sid = " . $GLOBALS['sid'] . " AND sched_type = " . SCHED_PAUSE . " AND sched_used = 1") > 0) return -3;
		$sched_used = 1;
	}
	$toret = 0;
	if (db_update("INSERT INTO " . TBL_SCHEDULE . " (sid, sched_starttime, sched_type, sched_name, sched_notes, sched_used, user_id, sched_length) VALUES (" . $GLOBALS['sid'] . ", " . $time . ", " . $type . ", '" . $name . "', '" . $notes . "', " . $sched_used . ", " . $suser_id . ", " . $length . ")") > 0) {
		$toret = 1;
		if ($time <= (time() + 600)) {
			updateLiveShows(true);
			updateNextEvents();
			sendGlobalSignal("sched_next");
		}
	}
	return $toret;
}

function endLiveShow($sched_id) {
	if (!preg_match("/^\d+$/", $sched_id)) return -1;
	$sched_data = db_row("SELECT * FROM " . TBL_SCHEDULE . " WHERE sched_id = " . $sched_id);
	if ($sched_data['sched_used'] > 1) return -2;
	if (($sched_data['sched_type'] != SCHED_LIVE) && ($sched_data['sched_type'] != SCHED_PAUSE)) return -3;
	if (($sched_data['user_id'] != $GLOBALS['user_id']) && ($GLOBALS['userdata']['radio_live_admin'] < 2)) return -4;
	if (db_update("UPDATE " . TBL_SCHEDULE . " SET sched_used = 2 WHERE sched_id = " . $sched_id) > 0) return 1;
	return 0;
}

function deleteLiveShow($sched_id) {
	if ($sched_id == 0) {
		if ($GLOBALS['userdata']['radio_live_admin'] == 0) return -2;
		if (db_update("DELETE FROM " . TBL_SCHEDULE . " WHERE sid = " . $GLOBALS['sid'] . " AND sched_type = " . SCHED_PAUSE) > 0) return 1;
		else return 0;
	}
	if (!preg_match("/^\d+$/", $sched_id)) return -1;
	if ($GLOBALS['userdata']['radio_live_admin'] != 2) return -2;
	$schedtime = db_single("SELECT sched_starttime FROM " . TBL_SCHEDULE . " WHERE sched_id = " . $sched_id);
	$toret = 0;
	if (db_update("DELETE FROM " . TBL_SCHEDULE . " WHERE sched_id = " . $_GET['sched_id']) > 0) {
		$toret = 1;
		if (($schedtime != 0) && ($schedtime <= (time() + 600))) {
			updateLiveShows(true);
			updateNextEvents();
			sendGlobalSignal("sched_next");
		}
	}
	return $toret;
}


function addOneShot($song_id, $starttime = 0) {
	if (!preg_match("/^\d+$/", $song_id)) return -1;
	if ($GLOBALS['userdata']['radio_live_admin'] == 0) return -2;
	if (db_single("SELECT COUNT(*) FROM " . TBL_SONGS . " WHERE song_id = " . $song_id . " AND song_verified = TRUE") >= 3) return -3;
	if ($starttime == 0) {
		if (db_single("SELECT COUNT(*) FROM " . TBL_SCHEDULE . " WHERE sched_type = " . SCHED_ONESHOT . " AND sched_used = 0 AND sched_starttime = 0") > 3) return -4;
	}
	else if (!preg_match("/^\d+$/", $starttime)) return -1;
	$toret = 0;
	if (db_update("INSERT INTO " . TBL_SCHEDULE . " (sid, sched_starttime, sched_type, sched_used, user_id) VALUES (" . $GLOBALS['sid'] . ", " . $starttime . ", " . SCHED_ONESHOT . ", 0, " . $GLOBALS['user_id'] . ")") > 0) {
		$sched_id = db_single("SELECT sched_id FROM " . TBL_SCHEDULE . " WHERE sched_used = 0 AND sched_type = " . SCHED_ONESHOT . " ORDER BY sched_id DESC LIMIT 1");
		if (db_update("INSERT INTO " . TBL_ONESHOT . " (sched_id, song_id) VALUES (" . $sched_id . ", " . $song_id . ")")) {
			$toret = 1;
			if (($starttime == 0) || ($starttime <= (time() + 600))) {
				updateNextEvents();
				sendGlobalSignal("sched_next");
			}
		}
	}
	return $toret;
}

function deleteOneShot($sched_id) {
	if (!preg_match("/^\d+$/", $sched_id)) return -1;
	$sched_data = db_row("SELECT user_id, sched_type, sched_used FROM " . TBL_SCHEDULE . " WHERE sched_id = " . $sched_id);
	if (($sched_data['user_id'] != $GLOBALS['user_id']) && ($GLOBALS['userdata']['radio_live_admin'] != 2)) return -2;
	if ($sched_data['sched_type'] != SCHED_ONESHOT) return -3;
	if ($sched_data['sched_used'] != 0) return -4;
	$toret = 0;
	if (db_update("DELETE FROM " . TBL_SCHEDULE . " WHERE sched_id = " . $sched_id) > 0) {
		$toret = 1;
		if ($schedtime <= (time() + 600)) {
			updateNextEvents();
			sendGlobalSignal("sched_next");
		}
	}
	return $toret;
}

function getForceCandidates() {
	if ($GLOBALS['userdata']['radio_live_admin'] > 0) {
		return db_table("SELECT command_id, song.song_title, album.album_name FROM " . TBL_COMMANDS . " JOIN " . TBL_SONGS . " ON (command_param = song_id) JOIN " . TBL_ALBUMS . " USING (album_id) WHERE command_return = 0 AND command_name = 'forceoption'");
	}
	else {
		return array();
	}
}

function addForceCandidate($song_id) {
	if (!preg_match("/^\d+$/", $song_id)) return -1;
	if ($GLOBALS['userdata']['radio_live_admin'] == 0) return -2;
	if (db_single("SELECT song_verified FROM " . TBL_SONGS . " WHERE song_id = " . $song_id) != "t") return -3;
	if (db_update("INSERT INTO " . TBL_COMMANDS . " (sid, command_name, command_param) VALUES (" . $GLOBALS['sid'] . ", 'forceoption', " . $song_id . ")") > 0) {
		return 1;
	}
	return 0;
}

function deleteForceCandidate($command_id) {
	if (!preg_match("/^\d+$/", $command_id)) return -1;
	if ($GLOBALS['userdata']['radio_live_admin'] == 0) return -2;
	$cmd_data = db_row("SELECT sid, command_name, command_return FROM " . TBL_COMMANDS . " WHERE command_id = " . $command_id);
	if ($cmd_data['sid'] != $GLOBALS['sid']) return -3;
	if ($cmd_data['command_name'] != "forceoption") return -4;
	if ($cmd_data['command_return'] != 0) return -5;
	if (db_update("DELETE FROM " . TBL_COMMANDS . " WHERE command_id = " . $command_id) > 0) return 1;
	return 0;
}

?>