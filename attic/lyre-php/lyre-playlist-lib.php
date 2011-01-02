<?php

function getAllAlbums() {
	if ($GLOBALS['user_id'] > 1)
		//$sql = "SELECT album_id, album_name, album_rating_avg, album_lowest_oa, COALESCE(album_rating, 0) AS album_rating_user, CASE WHEN " . TBL_ALBUMFAVOURITES . ".album_id IS NOT NULL THEN 't' ELSE 'f' END AS album_favourite FROM " . TBL_ALBUMS . " LEFT JOIN (SELECT album_id, album_rating FROM " . TBL_ALBUMRATINGS . " WHERE user_id = " . $GLOBALS['user_id'] . ") AS albumratings USING (album_id) WHERE " . TBL_ALBUMS . ".album_verified = TRUE AND " . TBL_ALBUMS . ".sid = " . $GLOBALS['sid'];
		$sql = "SELECT album_id, album_name, album_rating_avg, album_lowest_oa, COALESCE(album_rating, 0) AS album_rating_user, CASE WHEN " . TBL_ALBUMFAVOURITES . ".album_id IS NOT NULL THEN 't' ELSE 'f' END AS album_favourite FROM " . TBL_ALBUMS . " LEFT JOIN (SELECT album_id, album_rating FROM " . TBL_ALBUMRATINGS . " WHERE user_id = " . $GLOBALS['user_id'] . ") AS " . TBL_ALBUMRATINGS . " USING (album_id) LEFT JOIN (SELECT album_id FROM " . TBL_ALBUMFAVOURITES . " WHERE user_id = " . $GLOBALS['user_id'] . ") AS " . TBL_ALBUMFAVOURITES . " USING (album_id) WHERE " . TBL_ALBUMS . ".album_verified = TRUE AND " . TBL_ALBUMS . ".sid = " . $GLOBALS['sid'];
	else
		$sql = "SELECT album_id, album_name, album_rating_avg, album_lowest_oa, 0 AS album_rating_user, 'f' AS album_favourite FROM " . TBL_ALBUMS . " WHERE album_verified = TRUE";

	$toreturn = db_table($sql);
	return $toreturn;
}

function getWholeAlbum($album_id) {
	$album = false;
	if ($GLOBALS['user_id'] > 1) {
		$album = db_row("SELECT " . FIELDS_ALLALBUM . ", COALESCE(album_rating, 0) AS album_rating_user, CASE WHEN " . TBL_ALBUMFAVOURITES . ".album_id IS NOT NULL THEN 't' ELSE 'f' END AS album_favourite FROM " . TBL_ALBUMS . " LEFT JOIN (SELECT album_id, album_rating FROM " . TBL_ALBUMRATINGS . " WHERE album_id = " . $album_id . " AND user_id = " . $GLOBALS['user_id'] . ") AS " . TBL_ALBUMRATINGs . " USING (album_id) LEFT JOIN (SELECT album_id FROM " . TBL_ALBUMFAVOURITES . " WHERE user_id = " . $GLOBALS['user_id'] . ") AS " . TBL_ALBUMFAVOURITES . " USING (album_id) WHERE " . TBL_ALBUMS . ".album_id = " . $album_id);
	}
	else {
		$album = db_row("SELECT " . FIELDS_ALLALBUM . ", 0 AS album_rating_user, 'f' AS album_favourite FROM " . TBL_ALBUMS . " WHERE album_id = " . $album_id);
	}
	// cooldown time // # favourites // win/loss // rating rank // #requests & rank
	$album['album_fav_count'] = db_single("SELECT COUNT(*) FROM " . TBL_ALBUMFAVOURITES . " WHERE album_id = " . $album_id);
	$album['album_rating_rank'] = 1 + db_single("SELECT COUNT(album_id) FROM " . TBL_ALBUMS . " WHERE sid = " . $GLOBALS['sid'] . " AND album_rating_count > " . $album['album_rating_count']);
	$album['album_timesplayed_rank'] = 1 + db_single("SELECT COUNT(album_id) FROM " . TBL_ALBUMS . " WHERE sid = " . $GLOBALS['sid'] . " AND album_timesplayed > " . $album['album_timesplayed']);
	$album['album_vote_rank'] = 1 + db_single("SELECT COUNT(album_id) FROM " . TBL_ALBUMS . " WHERE album_totalvotes > " . $album['album_totalvotes']);
	$album['album_request_rank'] = 1 + db_single("SELECT COUNT(album_id) FROM " . TBL_ALBUMS . " WHERE album_totalrequests > " . $album['album_totalrequests']);
	$album['album_winloss_rank'] = 1 + db_single("SELECT COUNT(album_id) FROM " . TBL_ALBUMS . " WHERE album_timeswon > " . $album['album_timeswon']);
	if ($GLOBALS['user_id'] > 1) {
		$album['song_data'] = db_table("SELECT " . FIELDS_ALLSONG . ", COALESCE(song_rating, 0) AS song_rating_user, CASE WHEN " . TBL_SONGFAVOURITES . ".song_id IS NOT NULL THEN 't' ELSE 'f' END AS song_favourite FROM " . TBL_SONGS . " LEFT JOIN (SELECT song_id, song_rating FROM " . TBL_SONGS . " JOIN " . TBL_SONGRATINGS . " USING (song_id) WHERE album_id = " . $album_id . " AND user_id = " . $GLOBALS['user_id'] . ") AS " . TBL_SONGRATINGS . " USING (song_id) LEFT JOIN (SELECT song_id FROM " . TBL_SONGS . " LEFT JOIN " . TBL_SONGFAVOURITES . " USING (song_id) WHERE album_id = " . $album_id . " AND user_id = " . $GLOBALS['user_id'] . ") AS " . TBL_SONGFAVOURITES . " USING (song_id) WHERE song_verified = TRUE AND album_id = " . $album_id);
	}
	else {
		$album['song_data'] = db_table("SELECT " . FIELDS_ALLSONG . ", 0 AS song_rating_user, 'f' AS song_favourite FROM " . TBL_SONGS . " WHERE song_verified = TRUE AND album_id = " . $album_id);
	}
	$artists = db_table("SELECT " . TBL_SONGS . ".song_id, " . FIELDS_ALLARTIST . " FROM " . TBL_SONGS . " JOIN " . TBL_SONG_ARTIST . " USING (song_id) JOIN " . TBL_ARTISTS . " USING (artist_id) WHERE song_verified = TRUE AND album_id = " . $album_id);
	for ($i = 0; $i < count($album['song_data']); $i++) {
		$album['song_data'][$i]['artists'] = array();
		for ($j = 0; $j < count($artists); $j++) {
			if ($album['song_data'][$i]['song_id'] == $artists[$j]['song_id']) {
				unset($artists[$j]['song_id']);
				array_push($album['song_data'][$i]['artists'], $artists[$j]);
			}
		}
	}
	$album['album_genres'] = db_table("SELECT DISTINCT oac_id AS genre_id, oac_name AS genre_name FROM " . TBL_SONGS . " JOIN " . TBL_SONG_OA_CAT . " USING (song_id) JOIN " . TBL_OA_CAT . " USING (oac_id) WHERE " . TBL_SONGS . ".album_id = " . $album_id . " AND song_verified = TRUE");
	
	$album['album_rating_histogram'] = array();
	$temp = db_table("SELECT album_rating, COUNT(album_rating) AS album_rating_count FROM rw_albumratings WHERE album_id = " . $album_id . " GROUP BY album_rating");
	for ($i = 0; $i < count($temp); $i++) {
		$album['album_rating_histogram'][$temp[$i]['album_rating']] = $temp[$i]['album_rating_count'];
	}
	return $album;
}

?>
