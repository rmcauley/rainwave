<?php

// Store user information in convenient variables
$user->session_begin();
$auth->acl($user->data);		// previously did not have this
//$user->setup();				// or this

globalizeUserData();

function globalizeUserData() {
	$GLOBALS['userdata'] =& $GLOBALS['user']->data;
	$GLOBALS['user_id'] =& $GLOBALS['userdata']['user_id'];
	$GLOBALS['username'] =& $GLOBALS['userdata']['username'];

	$GLOBALS['currentevent'] = array();
	$GLOBALS['listener'] = array();
	getCurrentEvent($GLOBALS['currentevent']);
	getListenerData($GLOBALS['listener'], $GLOBALS['currentevent']);
}

function fillSongDataForUser(&$song_data) {
	if (($GLOBALS['user_id'] > 1) && (count($song_data) > 0)) {
		$songsql = "";
		$albumsql = "";
		for ($i = 0; $i < count($song_data); $i++) {
			if ($i > 0) $songsql .= "OR ";
			$songsql .= "song_id = " . $song_data[$i]['song_id'] . " ";
			if (!strstr($albumsql, $song_data[$i]['album_id'] . " ")) {
				if ($i > 0) $albumsql .= "OR ";
				$albumsql .= "album_id = " . $song_data[$i]['album_id'] . " ";
			}
		}
		//print $songsql . " / " . $albumsql;
		$songrates = db_table("SELECT song_id, song_rating FROM " . TBL_SONGRATINGS . " WHERE user_id = " . $GLOBALS['user_id'] . " AND (" . $songsql . ")");
		$songfav = db_table("SELECT song_id FROM " . TBL_SONGFAVOURITES . " WHERE user_id = " . $GLOBALS['user_id'] . " AND (" . $songsql . ")");
		$albumrates = db_table("SELECT album_id, album_rating FROM " . TBL_ALBUMRATINGS . " WHERE user_id = " . $GLOBALS['user_id'] . " AND (" . $albumsql . ")");
		$albumfav = db_table("SELECT album_id FROM " . TBL_ALBUMFAVOURITES . " WHERE user_id = " . $GLOBALS['user_id'] . " AND (" . $albumsql . ")");
		
		for ($k = 0; $k < count($song_data); $k++) {
			$song_data[$k]['song_rating_user'] = 0;
			for ($i = 0; $i < count($songrates); $i++) {
				if ($song_data[$k]['song_id'] == $songrates[$i]['song_id']) {
					$song_data[$k]['song_rating_user'] = $songrates[$i]['song_rating'];
				}
			}
		}
		
		for ($k = 0; $k < count($song_data); $k++) {
			$song_data[$k]['song_favourite'] = false;
			for ($i = 0; $i < count($songfav); $i++) {
				$song_data[0]['debug'] .= $song_data[$k]['song_id'] . ":" . $songfav[$i]['song_id'];
				if ($song_data[$k]['song_id'] == $songfav[$i]['song_id']) {
					$song_data[$k]['song_favourite'] = true;
				}
			}
		}

		for ($k = 0; $k < count($song_data); $k++) {
			$song_data[$k]['album_rating_user'] = 0;
			for ($i = 0; $i < count($albumrates); $i++) {
				if ($song_data[$k]['album_id'] == $albumrates[$i]['album_id']) {
					$song_data[$k]['album_rating_user'] = $albumrates[$i]['album_rating'];
				}
			}
		}
		
		for ($k = 0; $k < count($song_data); $k++) {
			$song_data[$k]['album_favourite'] = false;
			for ($i = 0; $i < count($albumfav); $i++) {
				if ($song_data[$k]['album_id'] == $albumfav[$i]['album_id']) {
					$song_data[$k]['album_favourite'] = true;
				}
			}
		}
	}
	else {
		for ($k = 0; $k < count($song_data); $k++) {
			$song_data[$k]['song_rating_user'] = 0;
			$song_data[$k]['album_rating_user'] = 0;
			$song_data[$k]['song_favourite'] = false;
			$song_data[$k]['album_favourite'] = false;
		}
	}
}

//-------------------------------------------------------------------------------------------------------

function getCurrentEvent(&$ce, $userdata = true) {
	$ce = $GLOBALS['memcached']->get($GLOBALS['sid'] . "_current_event");
	$ce['sched_timeleft'] = $ce['sched_endtime'] - time();
	if ($userdata) fillSongDataForUser($ce['song_data']);
	return $ce;
}

//-------------------------------------------------------------------------------------------------------

function getNextEvents(&$nextsongs, $userdata = true) {
	$nextsongs = $GLOBALS['memcached']->get($GLOBALS['sid'] . "_next_events");
	if ($userdata) {
		for ($i = 0; $i < count($nextsongs); $i++) fillSongDataForUser($nextsongs[$i]['song_data']);
	}
	return $nextsongs;
}

//-------------------------------------------------------------------------------------------------------

function getLastEvents(&$lp, $userdata = true, $userhistory = true) {
	$lp = $GLOBALS['memcached']->get($GLOBALS['sid'] . "_last_events");
	if ($userdata) {
		for ($i = 0; $i < count($lp); $i++) fillSongDataForUser($lp[$i]['song_data']);
	}
	if (($userhistory) && ($GLOBALS['user_id'] > 1)) {
		$lsh = db_table("SELECT sched_id FROM " . TBL_LISTENERHISTORY . " WHERE sid = " . $GLOBALS['sid'] . " AND user_id = " . $GLOBALS['user_id'] . " ORDER BY sched_id DESC LIMIT " . (count($lp) + 1));
		for ($k = 0; $k < count($lp); $k++) {
			$lp[$k]['user_wastunedin'] = 0;
			for ($i = 0; $i < count($lsh); $i++) {
				if ($lp[$k]['sched_id'] == $lsh[$i]['sched_id']) { $lp[$k]['user_wastunedin'] = 1; }
			}
		}
	}
	else {
		for ($k = 0; $k < count($lp); $k++) {
			$lp[$k]['user_wastunedin'] = 0;
		}
	}
}

//-------------------------------------------------------------------------------------------------------

function getListenerData(&$listener, &$ce) {
	$listener = array();
	$GLOBALS['userdata']['radio_perks'] = 0;
	$GLOBALS['userdata']['radio_admin'] = 0;
	$GLOBALS['userdata']['radio_live_admin'] = 0;
	$listener['sid'] = $GLOBALS['sid'];
	$statrestrict = 0;
	// registered users make use of the key auth via icecast, so they'll always have a lock on their row
	if ($GLOBALS['user_id'] > 1) {
		if (db_single("SELECT COUNT(*) FROM " . TBL_LISTENERS . " WHERE sid = " . $GLOBALS['sid'] . " AND user_id = " . $GLOBALS['user_id'] . " AND list_purge = FALSE") > 0) {
			$listener = db_row("SELECT * FROM " . TBL_LISTENERS . " WHERE sid = " . $GLOBALS['sid'] . " AND user_id = " . $GLOBALS['user_id']);
			if (($listener['list_id'] > 0) && ($listener['list_purge'] == 0)) $listener['tunedin'] = 1;
		}
		else {
			$listener['tunedin'] = 0;
		}
		
		if (($GLOBALS['userdata']['group_id'] == 5) || ($GLOBALS['userdata']['group_id'] == 4) || ($GLOBALS['userdata']['group_id'] == 8) || ($GLOBALS['userdata']['group_id'] == 12) || ($GLOBALS['userdata']['group_id'] == 15) || ($GLOBALS['userdata']['group_id'] == 14)) {
			$GLOBALS['userdata']['radio_perks'] = 1;
		}
		
		// Universal admin
		if ($GLOBALS['userdata']['group_id'] == 5) {
			$GLOBALS['userdata']['radio_admin'] = $GLOBALS['sid'];
			$GLOBALS['userdata']['radio_live_admin'] = 2;
		}
		// jf
		else if ($GLOBALS['user_id'] == 9575) {
			$GLOBALS['userdata']['radio_admin'] = $GLOBALS['sid'];
		}
		// Rainwave admins
		else if (($GLOBALS['sid'] == 1) && ($GLOBALS['userdata']['group_id'] == 12)) {
			$GLOBALS['userdata']['radio_admin'] = $GLOBALS['sid'];
			$GLOBALS['userdata']['radio_live_admin'] = 2;
		}
		// OCR admins
		else if (($GLOBALS['sid'] == 2) && ($GLOBALS['userdata']['group_id'] == 15)) {
			$GLOBALS['userdata']['radio_admin'] = $GLOBALS['sid'];
			$GLOBALS['userdata']['radio_live_admin'] = 2;
		}
		else if (($GLOBALS['sid'] == 3) && ($GLOBALS['userdata']['group_id'] == 14)) {
			$GLOBALS['userdata']['radio_admin'] = $GLOBALS['sid'];
			$GLOBALS['userdata']['radio_live_admin'] = 2;
		}
		if ($GLOBALS['memcached']->get($GLOBALS['sid'] . "_current_dj") == $GLOBALS['user_id']) {
			$GLOBALS['userdata']['radio_live_admin'] = 1;
		}
		
		$usersreq = db_row("SELECT request_id, request_expires_at FROM " . TBL_REQUESTS . " WHERE sid = " . $GLOBALS['sid'] . " AND user_id = " . $GLOBALS['user_id'] . " AND request_fulfilled_at = 0 ORDER BY request_id LIMIT 1");
		$listener['radio_requestposition'] = 0;
		$listener['radio_request_expires_at'] = 0;
		if (isset($usersreq['request_id'])) {
			$listener['radio_requestposition'] = 1 + db_single("SELECT COUNT(*) FROM " . TBL_REQUESTS . " WHERE sid = " . $GLOBALS['sid'] . " AND request_id < " . $usersreq['request_id'] . " AND request_fulfilled_at = 0");
			if ($usersreq['request_expires_at'] > 0) $listener['radio_request_expires_at'] = $usersreq['request_expires_at'];
		}
		
		$statrestrict = 1;
		if ($GLOBALS['userdata']['radio_active_until'] <= ($ce['sched_actualtime'] + 10)) $statsrestrict = 0;
		if ($GLOBALS['userdata']['radio_active_sid'] == $GLOBALS['sid']) $statrestrict = 0;
		/*else if (($GLOBALS['userdata']['radio_active_until'] - $ce['sched_actualtime']) <= 0) $statrestrict = 0;
		else if (($ce['sched_endtime'] - $ce['sched_actualtime']) == 0) $statrestrict = 0;
		else if ((($GLOBALS['userdata']['radio_active_until'] - $ce['sched_actualtime']) / ($ce['sched_endtime'] - $ce['sched_actualtime'])) < .4) $statrestrict = 0;*/

		// avatar code adopted from phpBB's includes/functions_display.php
		if (empty($GLOBALS['userdata']['user_avatar']) || !$GLOBALS['userdata']['user_avatar_type']) {
			$listener['user_avatar'] = "images/blank_avatar.png";
		}
		else {
			$avatar_img = '';
			// uploaded avatar
			if ($GLOBALS['userdata']['user_avatar_type'] == 1) $avatar_img = "/forums/download/file.php?avatar=";
			$listener['user_avatar'] = $avatar_img . $GLOBALS['userdata']['user_avatar'];
		}
	}
	else {
		$listener['user_avatar'] = "images/blank_avatar.png";
		$listener['tunedin'] = 0;
		// if listener is already recognized with his session id. get the session
		if (db_single("SELECT COUNT(*) FROM " . TBL_LISTENERS . " WHERE sid = " . $GLOBALS['sid'] . " AND list_purge = FALSE AND session_id = '" . $GLOBALS['userdata']['session_id'] . "'") > 0) {
			$listener = db_row("SELECT * FROM " . TBL_LISTENERS . " WHERE sid = " . $GLOBALS['sid'] . " AND session_id = '" . $GLOBALS['userdata']['session_id'] . "'");
			if (($listener['list_id'] > 0) && ($listener['list_purge'] == 0)) $listener['tunedin'] = 1;
		}
		else {
			// see if there's an available (session_id is null) slot for this anonymous user
			$available = db_single("SELECT list_id FROM " . TBL_LISTENERS . " WHERE sid = " . $GLOBALS['sid'] . " AND list_ip_address = '" . $_SERVER['REMOTE_ADDR'] . "' AND session_id IS NULL AND user_id = 1 ORDER BY list_id ASC LIMIT 1");
			if ($available > 0) {
				// attempt to assign him the listener
				if (db_update("UPDATE " . TBL_LISTENERS . " SET session_id = '" . $GLOBALS['userdata']['session_id'] . "' WHERE list_id = " . $available)) {
					// get the listener row
					$listener = db_row("SELECT * FROM " . TBL_LISTENERS . " WHERE sid = " . $GLOBALS['sid'] . " AND session_id = '" . $GLOBALS['userdata']['session_id'] . "'");
					if ($listener['list_id'] > 0) {
						$listener['tunedin'] = 1;
					}
				}
			} // end $available > 0
		} // end if (session claimed)
	} // end if user id > 1
	$listener['user_id'] = $GLOBALS['user_id'];
	$listener['username'] = $GLOBALS['username'];
	$listener['user_new_privmsg'] = $GLOBALS['userdata']['user_new_privmsg'];
	$listener['user_notify_pm'] = $GLOBALS['userdata']['user_notify_pm'];
	$listener['radio_lastnews'] = $GLOBALS['userdata']['radio_lastnews'];
	$listener['radio_perks'] = $GLOBALS['userdata']['radio_perks'];
	$listener['radio_statrestricted'] = $statrestrict;
	$listener['radio_admin'] = $GLOBALS['userdata']['radio_admin'];
	$listener['radio_live_admin'] = $GLOBALS['userdata']['radio_live_admin'];
	$listener['radio_listenkey'] = $GLOBALS['userdata']['radio_listenkey'];
}

//-------------------------------------------------------------------------------------------------------

function updateListenerUseTime($sched_data) {
	if ($GLOBALS['user_id'] <= 1) return;
	if ($GLOBALS['listener']['radio_statrestricted'] == true) return;
	if ($sched_data['sched_type'] != SCHED_ELEC) return;
	$longestsong = 0;
	if ($sched_data['sched_id'] == $GLOBALS['currentevent']['sched_id']) $longestsong = $sched_data['song_data'][0]['song_secondslong'];
	else {
		for ($i = 0; $i < count($sched_data['song_data']); $i++) {
			if ($longestsong < $sched_data['song_data'][$i]['song_secondslong']) $longestsong = $sched_data['song_data'][$i]['song_secondslong'];
		}
	}
	$endactive = $sched_data['sched_actualtime'] > 0 ? $sched_data['sched_actualtime'] :  $sched_data['sched_starttime'];
	$endactive += $longestsong;
	if ($GLOBALS['userdata']['radio_active_until'] < $endactive) {
		db_update("UPDATE " . USERS_TABLE . " SET radio_active_sid = " . $GLOBALS['sid'] . ", radio_active_until = " . $endactive . ", radio_lastactive = " . time() . " WHERE user_id = " . $GLOBALS['user_id']);
	}
	
	if (($sched_data['sched_id'] == $GLOBALS['currentevent']['sched_id']) && ($GLOBALS['listener']['list_active'] == "f")) {
		db_update("UPDATE " . USERS_TABLE . " SET radio_usetime = radio_usetime + " . $GLOBALS['currentevent']['song_data'][0]['song_secondslong'] . " WHERE user_id = " . $GLOBALS['user_id']);
		db_update("UPDATE " . TBL_LISTENERS . " SET list_active = TRUE WHERE user_id = " . $GLOBALS['user_id']);
	}
}

//-------------------------------------------------------------------------------------------------------

function submitVote($elec_entry_id = 0) {
	// 1 on success
	// 0 on DB failure
	// -1 on not tuned in
	// -2 on invalid elec_entry_id or no elec_entry_id
	// -3 already voted
	// -4 station hopping restricted
	// -5 nonexistent entry ID
	// -6 voted too late / schedule is already done
	// -7 voted too early
	// -8 wrong station ID

	if ($GLOBALS['listener']['tunedin'] <= 0) return -1;
	if (!preg_match("/^\d+$/", $elec_entry_id)) return -2;
	if ($elec_entry_id <= 0) return -2;
	if (($GLOBALS['userdata']['radio_perks'] == 0) && ($GLOBALS['listener']['list_voted_entry_id'] > 0)) return -3;
	if ($GLOBALS['listener']['radio_statrestricted'] == 1) return -4;

	$elec_entry = db_row("SELECT " . TBL_ELECTIONS . ".*, sid, sched_used FROM " . TBL_ELECTIONS . " JOIN " . TBL_SCHEDULE . " USING (sched_id) WHERE elec_entry_id = " . $elec_entry_id);

	if (!isset($elec_entry['sched_id'])) return -5;
	if ($elec_entry['sched_used'] != 0) return -6;
	if ($GLOBALS['user_id'] > 1) {
		if (db_single("SELECT COUNT(*) FROM " . TBL_VOTEHISTORY . " WHERE user_id = " . $GLOBALS['user_id'] . " AND sched_id = " . $elec_entry['sched_id']) > 0) return -3;
	}
	
	$nextevents = array();
	getNextEvents($nextevents, false);
	
	$earliestelec = 0;
	$sched_data = false;
	for ($i = 0; $i < count($nextevents); $i++) {
		if (($earliestelec == 0) && ($nextevents[$i]['sched_type'] == SCHED_ELEC)) {
			$earliestelec = $nextevents[$i]['sched_id'];
		}
		if ($elec_entry['sched_id'] == $nextevents[$i]['sched_id']) {
			$sched_data = $nextevents[$i];
		}
	}
	
	if (($GLOBALS['userdata']['radio_perks'] == 0) && ($elec_entry['sched_id'] > $earliestelec)) return -7;
	if ($elec_entry['sid'] != $GLOBALS['sid']) return -8;

	$list_id = $GLOBALS['listener']['list_id'];
	db_update("START TRANSACTION");
	if (db_update("UPDATE " . TBL_LISTENERS . " SET list_voted_entry_id = " . $elec_entry_id . ", list_voted_sid = " . $GLOBALS['sid'] . " WHERE list_id = " . $list_id) < 1) {
		db_update("ROLLBACK");
		return 0;
	}
	if (db_update("UPDATE " . TBL_ELECTIONS . " SET elec_votes = elec_votes + 1 WHERE elec_entry_id = " . $elec_entry_id) < 1) {
		db_update("ROLLBACK");
		return 0;
	}
	if ($GLOBALS['user_id'] > 1) {
		$numvotes = db_single("SELECT COUNT(*) FROM " . TBL_VOTEHISTORY . " WHERE user_id = " . $GLOBALS['user_id']) + 1;
		$rank = db_single("SELECT COUNT(*) FROM " . USERS_TABLE . " WHERE radio_totalvotes > " . $numvotes);
		if (db_update("INSERT INTO " . TBL_VOTEHISTORY . " (sched_id, user_id, song_id, user_rank, elec_entry_id, user_vote_snapshot) VALUES (" . $elec_entry['sched_id'] . ", " . $GLOBALS['user_id'] . ", " . $elec_entry['song_id'] . ", " . $rank . ", " . $elec_entry_id . ", " . $numvotes . ")") < 1) {
			db_update("ROLLBACK");
			return 0;
		}
		db_update("UPDATE " . USERS_TABLE . " SET radio_totalvotes = " . $numvotes . " WHERE user_id = " . $GLOBALS['user_id']);
		updateListenerUseTime($sched_data);
	}
	db_update("COMMIT");
	$GLOBALS['listener']['list_voted_entry_id'] = $elec_entry_id;
	return 1;
}

//-------------------------------------------------------------------------------------------------------

function submitRating($category = "error", $id = 0, $rating) {
	// 1 is success
	// 0 is DB insert error
	// -1 is no user ID
	// -2 on not tuned in
	// -3 on invalid category
	// -4 on invalid ID / no data
	// -5 on invalid rating (out of bounds or non-numeric)
	// -6 on user wasn't tuned in recently
	// -7 is stat restricted

	if ($GLOBALS['user_id'] <= 1) return -1;
	if ($GLOBALS['listener']['tunedin'] <= 0) return -2;
	$dbtable;
	if ($category == "album") $dbtable = TBL_ALBUMRATINGS;
	else if ($category == "song") $dbtable = TBL_SONGRATINGS;
	else return -3;
	if (!preg_match("/\d(\.\d)?$/", $rating) || !preg_match("/^\d+$/", $id)) { return -4; }
	if (($rating < 1) || ($rating > 5)) return -5;
	if ((($rating % 1) != 0) && (($rating % 1) != 0.5)) return -5;
	if ($GLOBALS['listener']['radio_statrestricted']) return -7;

	$ratingok = false;
	
	if (isset($GLOBALS['currentevent']['song_data'][0])) {
		if (($category == "album") && ($GLOBALS['currentevent']['song_data'][0]['album_id'] == $id)) $ratingok = true;
		else if (($category == "song") && ($GLOBALS['currentevent']['song_data'][0]['song_id'] == $id)) $ratingok = true;
	}

	if (!$ratingok) {
		$le = array();
		getLastEvents($le, false, true);
		for ($i = 0; $i < count($le); $i++) {
			if (($le[$i]['user_wastunedin'] == 1) && ($category == "album") && ($le[$i]['song_data'][0]['album_id'] == $id)) $ratingok = true;
			else if (($le[$i]['user_wastunedin'] == 1) && ($category == "song") && ($le[$i]['song_data'][0]['song_id'] == $id)) $ratingok = true;
		}
	}

	if (!$ratingok) return -6;

	if ($ratingok) {
		$check = db_single("SELECT COUNT(*) FROM " . $dbtable . " WHERE " . $category . "_id = " . $id . " AND user_id = " . $GLOBALS['user_id']);
		if ($check > 0) {
			if ($check == $rating) return 1;
			if (db_update("UPDATE " . $dbtable . " SET " . $category . "_rating = " . $rating . " WHERE user_id = " . $GLOBALS['user_id'] . " AND " . $category . "_id = " . $id) < 1) return 0;
			db_update("UPDATE " . USERS_TABLE . " SET radio_totalmindchange = radio_totalmindchange + 1 WHERE user_id = " . $GLOBALS['user_id']);
		}
		else {
			$numratings = db_single("SELECT COUNT(*) FROM " . TBL_SONGRATINGS . " JOIN " . TBL_SONGS . " USING (song_id) WHERE user_id = " . $GLOBALS['user_id'] . " AND song_verified = TRUE");
			$numratings += db_single("SELECT COUNT(*) FROM " . TBL_ALBUMRATINGS . " JOIN " . TBL_ALBUMS . " USING (album_id) WHERE user_id = " . $GLOBALS['user_id'] . " AND album_verified = TRUE");
			$numratings += 1;
			$rank = db_single("SELECT COUNT(*) FROM " . USERS_TABLE . " WHERE radio_totalratings > " . $numratings);
			if (db_update("INSERT INTO " . $dbtable . " (" . $category . "_id, " . $category . "_rating, user_id, user_rating_rank, user_rating_snapshot) VALUES (" . $id . ", " . $rating . ", " . $GLOBALS['user_id'] . ", " . $rank . ", " . $numratings . ")") < 1) return 0;
			db_update("UPDATE " . USERS_TABLE . " SET radio_totalratings = " . $numratings . " WHERE user_id = " . $GLOBALS['user_id']);
		}
		updateListenerUseTime($GLOBALS['currentevent']);
	}
	return 1;
}

//-------------------------------------------------------------------------------------------------------

function getRequests(&$queued) {
	$queued = Array();
	if ($GLOBALS['user_id'] > 0) {
		// song_available - album_in_election as song_available used to be below - not sure why...
		//db_table("SELECT request_id, " . FIELDS_LIGHTSONG . ", " . FIELDS_LIGHTALBUM . ", song_available, song_releasetime, request_expires_at FROM " . TBL_REQUESTS. " JOIN " . TBL_SONGS . " USING (song_id) JOIN " . TBL_ALBUMS . " USING (album_id) WHERE user_id = " . $GLOBALS['user_id'] . " AND request_fulfilled_at = 0 ORDER BY song_available DESC, request_id ASC, song_releasetime ASC", $active);
		$queued = db_table("SELECT requestq_id, requestq_order, " . FIELDS_LIGHTSONG . ", " . FIELDS_LIGHTALBUM . ", song_available, song_releasetime FROM " . TBL_REQUEST_QUEUE. " JOIN " . TBL_SONGS . " USING (song_id) JOIN " . TBL_ALBUMS . " USING (album_id) WHERE user_id = " . $GLOBALS['user_id'] . " ORDER BY requestq_order ASC, requestq_id ASC");
		/*for ($i = 0; $i < count($active); $i++) {
			$active[$i]['request_position'] = db_single("SELECT COUNT(*) FROM " . TBL_REQUESTS . " WHERE request_id < " . $active[$i]['request_id'] . " AND request_fulfilled_at = 0");
		}*/
	}
}

function alreadyRequested($song_id) {
	//  1 = no
	// -1 = song already requested
	// -2 = album already requested
	$album_id = db_single("SELECT album_id FROM " . TBL_SONGS . " WHERE song_id = " . $song_id);
	/*
	// already requested song in active requests
	$alreadyreq = db_single("SELECT COUNT(request_id) FROM " . TBL_REQUESTS . " WHERE user_id = " . $GLOBALS['user_id'] . " AND request_fulfilled_at = 0 AND song_id = " . $song_id);
	if ($alreadyreq > 0) return -1;
	// already requested album in active requests
	$alreadyreq = db_single("SELECT COUNT(request_id) FROM " . TBL_REQUESTS . " JOIN " . TBL_SONGS . " USING (song_id) WHERE request_fulfilled_at = 0 AND album_id = " . $album_id . " AND user_id = " . $GLOBALS['user_id']);
	if ($alreadyreq > 0) return -2;
	*/
	// already requested song in queue
	$alreadyreq = db_single("SELECT COUNT(requestq_id) FROM " . TBL_REQUEST_QUEUE . " WHERE user_id = " . $GLOBALS['user_id'] . " AND song_id = " . $song_id);
	if ($alreadyreq > 0) return -1;
	// already requested album in queue
	$alreadyreq = db_single("SELECT COUNT(requestq_id) FROM " . TBL_REQUEST_QUEUE . " JOIN " . TBL_SONGS . " USING (song_id) WHERE user_id = " . $GLOBALS['user_id'] . " AND album_id = " . $album_id);
	if ($alreadyreq > 0) return -2;
}

function submitNewRequest($song_id) {
	//  1 = success
	//  0 = DB error
	// -1 = not logged in
	// -2 = not tuned in
	// -3 = invalid song ID
	// -4 = queue full
	// -5 = song already requested
	// -6 = album already requested
	// -7 = more than 15 minutes OA
	
	if ($GLOBALS['user_id'] <= 1) return -1;
	if ($GLOBALS['listener']['tunedin'] == false) return -2;
	if (!preg_match("/^\d+$/", $song_id)) return -3;
	if (db_single("SELECT COUNT(*) FROM " . TBL_SONGS . " WHERE song_id = " . $song_id) == 0) return -3;
	//if (db_single("SELECT song_releasetime FROM " . TBL_SONGS . " WHERE song_id = " . $song_id) > (time() + 900)) return -7;
	
	//$inqueue = 0;
	$numrequests = db_single("SELECT COUNT(request_id) FROM " . TBL_REQUESTS . " WHERE user_id = " . $GLOBALS['user_id'] . " AND request_fulfilled_at = 0 AND sid != " . $GLOBALS['sid']);
	if ($numrequests >= 1) {
		db_update("DELETE FROM " . TBL_REQUESTS . " WHERE user_id = " . $GLOBALS['user_id'] . " AND request_fulfilled_at = 0");
	}
	$maxqueue = $GLOBALS['userdata']['radio_perks'] == 1 ? 12 : 3;
	$numqueue = db_single("SELECT COUNT(requestq_id) FROM " . TBL_REQUEST_QUEUE . " WHERE user_id = " . $GLOBALS['user_id']);
	if ($numqueue >= $maxqueue) return -4;
	
	$alreadyreq = alreadyRequested($song_id);
	if ($alreadyreq == -1) return -5;
	else if ($alreadyreq == -2) return -6;
	
	if (db_single("SELECT COUNT(*) FROM " . TBL_REQUESTS . " WHERE user_id = " . $GLOBALS['user_id'] . " AND request_fulfilled_at = 0") == 0) {
		db_update("INSERT INTO " . TBL_REQUESTS . " (sid, user_id) VALUES (" . $GLOBALS['sid'] . ", " . $GLOBALS['user_id'] . ")");
		setRequests();
	}
	
	return db_update("INSERT INTO " . TBL_REQUEST_QUEUE . " (song_id, user_id) VALUES (" . $song_id . ", " . $GLOBALS['user_id'] . ")");
	
	/*$result = 0;
	//if ($inqueue == 1)
	$result = insertNewQueued($song_id, $GLOBALS['user_id']);
	// else {
		// $result = insertNewRequest($song_id, $GLOBALS['user_id']);
	// }
	return $result;*/
}

/*function changeActiveRequest($request_id, $song_id) {
	//  1 = success
	//  0 = DB error
	// -1 = not logged in
	// -2 = invalid request ID
	// -3 = invalid song ID
	// -4 = request does not belong to user
	// -5 = request already fulfilled
	// -6 = song doesn't exist
	if ($GLOBALS['user_id'] <= 1) return -1;
	if (!preg_match("/^\d+$/", $request_id)) return -2;
	if (!preg_match("/^\d+$/", $song_id)) return -3;
	$request = array();
	db_row("SELECT request_fulfilled_at, user_id FROM " . TBL_REQUESTS . " WHERE request_id = " . $request_id);
	if ($request['user_id'] != $GLOBALS['user_id']) return -4;
	if ($request['request_fulfilled_at'] != 0) return -5;
	$song = array();
	db_row("SELECT song_id FROM " . TBL_SONGS . " WHERE song_id = " . $song_id);
	if (count($song) == 0) return -6;
	if (db_update("UPDATE " . TBL_REQUESTS . " SET song_id = " . $song_id . " WHERE request_id = " . $request_id) == 0) return 0;
	return 1;
}*/

function changeQueuedRequest($requestq_id, $song_id) {
	//  1 = success
	//  0 = DB error
	// -1 = not logged in
	// -2 = invalid request ID
	// -3 = invalid song ID
	// -4 = request does not belong to user
	// -5 = song doesn't exist
	// -6 = already requested song
	// -7 = already requested album
	if ($GLOBALS['user_id'] <= 1) return -1;
	if (!preg_match("/^\d+$/", $requestq_id)) return -2;
	if (!preg_match("/^\d+$/", $song_id)) return -3;
	$request = db_row("SELECT user_id FROM " . TBL_REQUEST_QUEUE . " WHERE request_id = " . $requestq_id);
	if ($request['user_id'] != $GLOBALS['user_id']) return -4;
	$song = db_row("SELECT song_id FROM " . TBL_SONGS . " WHERE song_id = " . $song_id);
	if (count($song) == 0) return -5;
	$alreadyreq = alreadyRequested($song_id);
	if ($alreadyreq == -1) return -6;
	else if ($alreadyreq == -2) return -7;
	
	if (db_update("UPDATE " . TBL_REQUEST_QUEUE . " SET song_id = " . $song_id . " WHERE requestq_id = " . $requestq_id) == 0) return 0;
	return 1;
}

/*function deleteActiveRequest($request_id) {
	//  1 = success
	//  0 = DB error
	// -1 = user not logged in
	// -2 = invalid request ID
	// -3 = request does not belong to user
	// -4 = request already fulfilled
	// -5 = tried swapping with queue before deleting, swap success, couldn't delete now-queued request
	if ($GLOBALS['user_id'] <= 1) return -1;
	if (!preg_match("/^\d+$/", $request_id)) return -2;
	$request = array();
	db_row("SELECT request_id, request_fulfilled_at, user_id FROM " . TBL_REQUESTS . " WHERE request_id = " . $request_i, $request);
	if ($request['user_id'] != $GLOBALS['user_id']) return -3;
	if ($request['request_fulfilled_at'] > 0) return -4;
	$requestq = array();
	db_row("SELECT COUNT(requestq_id) FROM " . TBL_REQUEST_QUEUE . " WHERE user_id = " . $GLOBALS['user_id'] . " ORDER BY requestq_id", $requestq);
	if (count($requestq) > 0) {
		if (requestSwapActiveQueue($request_id, $requestq['requestq_id']) == 1) {
			if (deleteQueuedRequest($requestq['requestq_id']) == 0) return -5;
			return 1;
		}
	}
	if (db_update("DELETE FROM " . TBL_REQUESTS . " WHERE request_id = " . $request_id) == 0) return 0;
	return 1;	
}*/

function deleteQueuedRequest($requestq_id) {
	//  1 = success
	//  0 = DB error
	// -1 = user not logged in
	// -2 = invalid request ID
	// -3 = request does not belong to user
	if ($GLOBALS['user_id'] <= 1) return -1;
	if (!preg_match("/^\d+$/", $requestq_id)) return -2;
	$request = db_row("SELECT requestq_id, user_id FROM " . TBL_REQUEST_QUEUE . " WHERE requestq_id = " . $requestq_id);
	if ($request['user_id'] != $GLOBALS['user_id']) return -3;
	
	$toreturn = 0;
	if (db_update("DELETE FROM " . TBL_REQUEST_QUEUE . " WHERE requestq_id = " . $requestq_id) > 0) $toreturn = 1;
	/*if (db_single("SELECT COUNT(*) FROM " . TBL_REQUEST_QUEUE . " WHERE user_id = " . $GLOBALS['user_id']) == 0) {
		db_update("DELETE FROM " . TBL_REQUESTS . " WHERE user_id = " . $GLOBALS['user_id'] . " AND request_fulfilled_at = 0");
	}*/
	
	return $toreturn;
}

/*function requestSwapActiveQueue($active, $queued) {
	//  1 = success
	//  0 = DB error
	// -1 = not logged in
	// -2 = invalid request ID (either)
	// -3 = either request does not belong to user
	// -4 = active request has been fulfilled
	if ($GLOBALS['user_id'] <= 1) return -1;
	if (!preg_match("/^\d+/", $active) || !preg_match("/^\d+/", $queued)) return -2;
	$req_a = array();
	$req_q = array();
	db_row("SELECT song_id, user_id, request_fulfilled_at FROM " . TBL_REQUESTS . " WHERE request_id = " . $active, $req_a);
	db_row("SELECT song_id, user_id, request_fulfilled_at FROM " . TBL_REQUEST_QUEUE . " WHERE requestq_id = " . $queued, $req_q);
	if ((count($req_a) == 0) || (count($req_q) == 0)) return -2;
	if (($req_a['user_id'] != $GLOBALS['user_id']) || ($req_q['user_id'] != $GLOBALS['user_id'])) return -3;
	if ($req_a['request_fulfilled_at'] != 0) return -4;
	
	return swapActiveQueue($active, $queued);
}*/

/*function requestSwapQueueQueue($req_a_id, $req_b_id) {
	//  1 = success
	//  0 = DB error
	// -1 = not logged in
	// -2 = invalid request ID (either)
	// -3 = either request does not belong to the user
	if ($GLOBALS['user_id'] <= 1) return -1;
	if (!preg_match("/^\d+/", $active) || !preg_match("/^\d+/", $queued)) return -2;
	$req_a = array();
	$req_b = array();
	db_row("SELECT song_id, user_id FROM " . TBL_REQUEST_QUEUE . " WHERE requestq_id = " . $req_a_id, $req_a);
	db_row("SELECT song_id, user_id FROM " . TBL_REQUEST_QUEUE . " WHERE requestq_id = " . $req_b_id, $req_b);
	if ((count($req_a) == 0) || (count($req_b) == 0)) return -2;
	if (($req_a['user_id'] != $GLOBALS['user_id']) || ($req_b['user_id'] != $GLOBALS['user_id'])) return -3;
	
	db_update("START TRANSACTION");
	if (db_update("UPDATE " . TBL_REQUEST_QUEUE . " SET song_id = " . $req_b['song_id'] . " WHERE requestq_id = " . $req_a_id) == 0) {
		db_update("ROLLBACK");
		return 0;
	}
	if (db_update("UPDATE " . TBL_REQUEST_QUEUE . " SET song_id = " . $req_a['song_id'] . " WHERE requestq_id = " . $req_b_id) == 0) {
		db_update("ROLLBACK");
		return 0;
	}
	db_update("COMMIT");
	return 1;
}*/

function reorderQueuedRequests($order) {
	//  1 = success
	//  0 = DB error
	// -1 = malformed order
	// -2 = invalid request in order or not owner of request
	$reqs = split(",", $order);
	$forder = array();
	if (count($reqs) == 0) return -1;
	for ($i = 0; $i < count($reqs); $i++) {
		if (!preg_match("/^\d+$/", $reqs[$i])) return -1;
		if (db_single("SELECT COUNT(*) FROM " . TBL_REQUEST_QUEUE . " WHERE requestq_id = " . $reqs[$i] . " AND user_id = " . $GLOBALS['user_id']) == 0) return -2;
		array_push($forder, $reqs[$i]);
	}
	$finalresult = 1;
	for ($i = 0; $i < count($forder); $i++) {
		if (db_update("UPDATE " . TBL_REQUEST_QUEUE . " SET requestq_order = " . $i . " WHERE requestq_id = " . $forder[$i]) == 0) $finalresult = 1;
	}
	return $finalresult;
}

//-------------------------------------------------------------------------------------------------------

function setFavouriteOn($category, $id) {
	if ($GLOBALS['user_id'] <= 1) return -1;
	$dbtable;
	if ($category == "album") $dbtable = TBL_ALBUMFAVOURITES;
	else if ($category == "song") $dbtable = TBL_SONGFAVOURITES;
	else return -2;
	if (!preg_match("/^\d+$/", $id)) { return -3; }
	
	$already = db_single("SELECT COUNT(*) FROM " . $dbtable . " WHERE user_id = " . $GLOBALS['user_id'] . " AND " . $category . "_id = " . $id);
	if ($already > 0) return 1;
	
	return db_update("INSERT INTO " . $dbtable . " (user_id, " . $category . "_id) VALUES (" . $GLOBALS['user_id'] . ", " . $id . ")");
}

function setFavouriteOff($category, $id) {
	if ($GLOBALS['user_id'] <= 1) return -1;
	$dbtable;
	if ($category == "album") $dbtable = TBL_ALBUMFAVOURITES;
	else if ($category == "song") $dbtable = TBL_SONGFAVOURITES;
	else return -2;
	if (!preg_match("/^\d+$/", $id)) { return -3; }
	
	return db_update("DELETE FROM " . $dbtable . " WHERE user_id = " . $GLOBALS['user_id'] . " AND " . $category . "_id = " . $id);
}

//-------------------------------------------------------------------------------------------------------

function getPlaylistUpdate(&$playlist) {
	$playlist = $GLOBALS['memcached']->get($GLOBALS['site'] . "_album_list_update");
}

/*function getPlaylistWhole() {
	print "playlist = new Array();\n";
	if ($GLOBALS['user_id'] > 1) $sql = "SELECT album_id, album_name, ROUND(album_rating_avg, 1) AS album_rating_avg, UNIX_TIMESTAMP(album_lowest_oa) AS OA, ROUND(album_rating, 1) AS album_rating_user FROM " . ALBUMS_TABLE . " LEFT JOIN (SELECT album_id, album_rating FROM " . ALBUMRATINGS_TABLE . " WHERE user_id = " . $GLOBALS['user_id'] . ") AS albumratings USING (album_id) WHERE album_verified = TRUE";
	else $sql = "SELECT album_id, album_name, ROUND(album_rating_avg, 1) AS album_rating_avg, UNIX_TIMESTAMP(album_lowest_oa) as OA, '-0.1' AS album_rating_user FROM " . ALBUMS_TABLE . " WHERE album_verified = TRUE";

	$result = $GLOBALS['db']->sql_query($sql);
	while ($row = $GLOBALS['db']->sql_fetchrow($result)) {
		if ($row['album_rating_user'] == "") $row['album_rating_user'] = "-0.1";
		print "playlist[" . $row['album_id'] . "] = new function() { " . getJavascriptObject($row) . " };\n";
	}
	$GLOBALS['db']->sql_freeresult($result);
}*/

//-------------------------------------------------------------------------------------------------------

function rw_atx($refresh) {
	if ($refresh == "idtheft") {
		addOutput("error", array("text" => "Stated user ID does not match real user ID.  Attempting to steal a user's identity will not work."));
	}

	if (($refresh == "full") || ($refresh == "user")) rw_atxUser($refresh);
	if (($refresh == "full") || ($refresh == "sched_current")) rw_atxSchedCurrent($refresh);
	if (($refresh == "full") || ($refresh == "sched_next")) rw_atxSchedNext($refresh);
	if (($refresh == "full") || ($refresh == "sched_history")) rw_atxSchedHistory($refresh);
	if (($refresh == "full") || ($refresh == "requests") || ($refresh == "user") || ($_GET['requests'] == "all")) {
		rw_atxAllRequests($refresh);
		rw_atxRequests($refresh);
	}
	if (($refresh == "full") && ($_GET['playlist'] == "album")) {
		require("lyre-playlist-lib.php");
		addOutput("playlistalbums", getAllAlbums());
	}
	else if (($refresh == "full") || ($refresh == "playlist_update")) rw_atxPlaylistUpdate($refresh);
	
	if (($refresh == "full") && ($_GET['live'] == "get")) {
		require("lyre-live-lib.php");
		addOutput("live_shows", getLiveShows());
	}
	else if (($refresh == "full") && ($GLOBALS['memcached']->get("live_schedule_update") == 1)) {
		require("lyre-live-lib.php");
		addOutput("live_shows", getLiveShows());
	}
	
	if (($refresh == "full") || ($refresh == "news")) rw_atxNews($refresh);
}

function rw_atxUser($refresh = "unknown") {
	addOutput("user", $GLOBALS['listener']);
}

function rw_atxSchedCurrent($refresh = "unknown") {
	if (isset($GLOBALS['currentevent']['sched_paused'])) unset($GLOBALS['currentevent']['sched_paused']);
	addOutput("sched_current", $GLOBALS['currentevent']);
	
	if (($refresh == "full") && ($GLOBALS['user_id'] > 1)) {
		$votedon = db_single("SELECT elec_entry_id FROM " . TBL_VOTEHISTORY . " WHERE user_id = " . $GLOBALS['user_id'] . " AND sched_id = " . $GLOBALS['currentevent']['sched_id']);
		if ($votedon > 0) {
			addOutput("voteresult", array("elec_entry_id" => $votedon, "code" => 1, "text" => "Already voted."), true);
		}
	}
}

function rw_atxSchedNext($refresh = "unknown") {
	$ne = array();
	getNextEvents($ne);
	addOutput("sched_next", $ne);
	
	if (($refresh == "full") && ($GLOBALS['user_id'] > 1)) {
		for ($i = 0; $i < count($ne); $i++) {
			$votedon = db_single("SELECT elec_entry_id FROM " . TBL_VOTEHISTORY . " WHERE user_id = " . $GLOBALS['user_id'] . " AND sched_id = " . $ne[$i]['sched_id']);
			if ($votedon > 0) {
				addOutput("voteresult", array("elec_entry_id" => $votedon, "code" => 1, "text" => "Already voted."));
			}
		}
	}
	else if ($refresh == "full") {
		if ($GLOBALS['listener']['list_voted_entry_id'] > 0) {
			addOutput("voteresult", array("elec_entry_id" => $GLOBALS['listener']['list_voted_entry_id'], "code" => 1, "text" => "Already voted."));
		}
	}
}

function rw_atxSchedHistory($refresh = "unknown") {
	$le = array();
	getLastEvents($le);
	addOutput("sched_history", $le);
	if (($refresh == "full") && ($GLOBALS['user_id'] > 1)) {
		for ($i = 0; $i < count($le); $i++) {
			$votedon = db_single("SELECT elec_entry_id FROM " . TBL_VOTEHISTORY . " WHERE user_id = " . $GLOBALS['user_id'] . " AND sched_id = " . $le[$i]['sched_id']);
			if ($votedon > 0) {
				addOutput("voteresult", array("elec_entry_id" => $votedon, "code" => 1, "text" => "Already voted."));
			}
		}
	}
}

function rw_atxAllRequests($refresh = "unknown") {
	addOutput("requests_all", $GLOBALS['memcached']->get($GLOBALS['sid'] . "_all_requests"));
}

function rw_atxRequests($refresh = "unknown") {
	$queued = array();
	getRequests($queued);
	addOutput("requests_user", $queued);
}

function rw_atxPlaylistUpdate($refresh = "unknown") {
	addOutput("playlistalbums", $GLOBALS['memcached']->get($GLOBALS['sid'] . "_album_list_update"));
}

function rw_atxNews($refresh = "unknown") {
	$news = db_table("SELECT topic_id, topic_title FROM phpbb_topics WHERE forum_id = 7 AND topic_id > " . $GLOBALS['userdata']['radio_lastnews'] . " ORDER BY topic_id DESC LIMIT 3");
	addOutput("news", $news);
	if ($GLOBALS['userdata']['radio_lastnews'] < $news[0]['topic_id']) {
		db_update("UPDATE phpbb_users SET radio_lastnews = " . $news[0]['topic_id'] . " WHERE user_id = " . $GLOBALS['user_id']);
	}
}

//-------------------------------------------------------------------------------------------------------

function newAPIKey($rw = false) {
	$key = md5(uniqid(rand(), true));
	$key = substr($key, 0, 10);
	if ($GLOBALS['user_id'] == 1) {
		$c = db_single("SELECT COUNT(*) FROM " . TBL_APIKEYS . " WHERE user_id = 1 AND api_ip '" . $_SERVER['REMOTE_ADDR'] . "'");
		if ($c == 0) {
			// the insert query is the same throughout the code
			db_update("INSERT INTO " . TBL_APIKEYS . " (user_id, api_ip, api_key, api_isrw) VALUES (" . $GLOBALS['user_id'] . ", '" . $_SERVER['REMOTE_ADDR'] . "', '" . $key . "', " . ($rw ? "TRUE" : "FALSE") . ")");
		}
		else {
			db_update("UPDATE " . TBL_APIKEYS . " SET api_key = '" . $key . "' WHERE user_id = 1 AND api_ip = '" . $_SERVER['REMOTE_ADDR'] . "'");
		}
	}
	else if ($rw) {
		$c = db_single("SELECT COUNT(*) FROM " . TBL_APIKEYS . " WHERE user_id = " . $GLOBALS['user_id'] . " AND api_isrw = TRUE");
		if ($c == 0) {
			// again same insert query
			db_update("INSERT INTO " . TBL_APIKEYS . " (user_id, api_ip, api_key, api_isrw) VALUES (" . $GLOBALS['user_id'] . ", '" . $_SERVER['REMOTE_ADDR'] . "', '" . $key . "', " . ($rw ? "TRUE" : "FALSE") . ")");
		}
		else {
			db_update("UPDATE " . TBL_APIKEYS . " SET api_key = '" . $key . "' WHERE user_id = " . $GLOBALS['user_id'] . " AND api_isrw = TRUE");
		}
	}
	else {
		// same query again
		db_update("INSERT INTO " . TBL_APIKEYS . " (user_id, api_ip, api_key, api_isrw) VALUES (" . $GLOBALS['user_id'] . ", '" . $_SERVER['REMOTE_ADDR'] . "', '" . $key . "', " . ($rw ? "TRUE" : "FALSE") . ")");
	}
	
	return $key;
}

?>