<?php
if (isset($_GET['xml'])) header("Content-type: text/xml");
else header("Content-type: application/json");

require("lyre-common.php");
require("lyre-web.php");

if ($_GET['act'] == "requestnew") {
	$result = submitNewRequest($_GET['request_song_id']);
	$el = array();
	$el['code'] = $result;
	if ($result == 1) {
		$title = db_single("SELECT song_title FROM " . TBL_SONGS . " WHERE song_id = " . $_GET['request_song_id']);
		$el['song_title'] = $title;
		$el['text'] = "Request submitted for $title.";
	}
	else if ($result == 0) $el['text'] = "Site error while submitting request.";
	else if ($result == -1) $el['text'] = "You are not logged in.";
	else if ($result == -2) $el['text'] = "You are not tuned in.";
	else if ($result == -3) $el['text'] = "Invalid Song ID submitted.";
	else if ($result == -4) $el['text'] = "Your request queue is full.";
	else if ($result == -5) $el['text'] = "Song already requested.";
	else if ($result == -6) $el['text'] = "Album already requested.";
	else if ($result == -7) $el['text'] = "Song is on cooldown.";
	if ($result == 1) {
		rw_atx("requests");
	}
	addOutput("requestnewresult", $el);
}
/*else if ($_GET['act'] == "requestdela") {
	$result = deleteActiveRequest($_GET['request_id']);
	$el = array();
	$el['code'] = $result;
	if ($result == 1) $el['text'] = "Request deleted.";
	else if ($result == 0) $el['text'] = "Site error while deleting request.";
	else if ($result == -1) $el['text'] ="You must be logged in to delete a request.";
	else if ($result == -2) $el['text'] = "Invalid request ID.";
	else if ($result == -3) $el['text'] = "Request does not belong to you.";
	else if ($result == -4) $el['text'] = "Request already fulfilled.";
	else if ($result == -5) $el['text'] = "Request moved from active to queued.";
	if ($result == 1) {
		setRequests();
		rw_atxRequests();
	}
	addOutput("requestdelresult", $el);
}*/
else if ($_GET['act'] == "requestdel") {
	$result = deleteQueuedRequest($_GET['requestq_id']);
	$el = array();
	$el['code'] = $result;
	if ($result == 1) $el['text'] = "Request deleted.";
	else if ($result == 0) $el['text'] = "Site error while deleting request.";
	else if ($result == -1) $el['text'] = "You have to be logged in to change requests.";
	else if ($result == -2) $el['text'] = "Invalid request queue ID.";
	else if ($result == -3) $el['text'] = "Request does not belong to you.";
	if ($result == 1) rw_atxRequests();
	addOutput("requestdelresult", $el);
}
else if ($_GET['act'] == "requestorder") {
	$result = reorderQueuedRequests($_GET['order']);
	$el = array();
	$el['code'] = $result;
	if ($result == 1) $el['text'] = "Requests re-ordered.";
	else if ($result == 0) $el['text'] = "Site error while reordering requests.";
	else if ($result == -1) $el['text'] = "Malformed order request.";
	else if ($result == -2) $el['text'] = "Invalid request or user does not own request in given order.";
	if ($result == 1) rw_atxRequests();
	addOutput("requestorderresult", $el);
}
/*else if ($_GET['act'] == "requestswapaq") {
	$result = requestSwapActiveQueue($_GET['request_id'], $_GET['requestq_id']);
	$el = array();
	$el['code'] = $result;
	if ($result == 1) $el['text'] = "Requests swapped.";
	else if ($result == 0) $el['text'] = "Site error while swapping requests.";
	else if ($result == -1) $el['text'] = "You must be logged in to swap requests.";
	else if ($result == -2) $el['text'] = "Invalid request or request queue ID.";
	else if ($result == -3) $el['text'] = "Cannot request swap with a request that isn't yours.";
	else if ($result == -4) $el['text'] = "Active request has already been fulfilled.";
	if ($result == 1) {
		setRequests();
		rw_atxRequests();
	}
	addOutput("requestswapaqresult", $el);
}*/
else if ($_GET['act'] == "requestswapqq") {
	$result = requestSwapQueueQueue($_GET['requestq_id1'], $_GET['requestq_id2']);
	$el['code'] = $result;
	if ($result == 1) $el['text'] = "Requests swapped.";
	else if ($result == 0) $el['text'] = "Site error while swapping requests.";
	else if ($result == -1) $el['text'] = "You must be logged in to swap requests.";
	else if ($result == -2) $el['text'] = "Submitted request queue IDs invalid.";
	else if ($result == -3) $el['text'] = "One of the requests does not belong to you.";
	if ($result == 1) rw_atxRequests();
	addOutput("requestswapqq", $el);
}
/*else if ($_GET['act'] == "requestchangea") {
	$result = changeActiveRequest($_GET['request_id'], $_GET['song_id']);
	$el = array();
	$el['code'] = $result;
	if ($result == 1) $el['text'] = "Request changed.";
	else if ($result == 0) $el['text'] = "Site error while changing request.";
	else if ($result == -1) $el['text'] = "You must be logged in to use requests.";
	else if ($result == -2) $el['text'] = "Invalid request ID.";
	else if ($result == -3) $el['text'] = "Invalid song ID.";
	else if ($result == -4) $el['text'] = "Request does not belong to you.";
	else if ($result == -5) $el['text'] = "Request already fulfilled.";
	else if ($result == -6) $el['text'] = "Song does not exist.";
	if ($result == 1) {
		setRequests();
		rw_atxRequests();
	}
	addOutput("requestchangearesult", $el);
}*/
	//  1 = success
	//  0 = DB error
	// -1 = not logged in
	// -2 = invalid request ID
	// -3 = invalid song ID
	// -4 = request does not belong to user
	// -5 = song doesn't exist
	// -6 = already requested song
	// -7 = already requested album
else if ($_GET['act'] == "requestchangeq") {
	$result = changeQueuedRequest($_GET['reqestq_id'], $_GET['request_id']);
	$el = array();
	$el['code'] = $result;
	if ($result == 1) $el['text'] = "Request changed.";
	else if ($result == 0) $el['text'] = "Site error while changing request.";
	else if ($result == -1) $el['text'] = "You must be logged in to use requests.";
	else if ($result == -2) $el['text'] = "Invalid request ID.";
	else if ($result == -3) $el['text'] = "Invalid song ID.";
	else if ($result == -4) $el['text'] = "Request does not belong to you.";
	else if ($result == -5) $el['text'] = "Song does not exist.";
	else if ($result == -6) $el['text'] = "Song already requested.";
	else if ($result == -7) $el['text'] = "Album already requested.";
	if ($result == 1) rw_atxRequests();
	addOutput("requestchangeqresult", $el);
}
else if ($_GET['act'] == "vote") {
	$result = submitVote($_GET['elec_entry_id']);
	$el = array();
	$el['code'] = $result;
	if ($result == 1) {
		$el['text'] = "Vote submitted.";
		$el['elec_entry_id'] = $_GET['elec_entry_id'];
	}
	else if ($result == 0) $el['text'] = "Site error while submitting vote.";
	else if ($result == -1) $el['text'] = "You must be tuned in to vote.";
	else if ($result == -2) $el['text'] = "Invalid candidate ID.";
	else if ($result == -3) $el['text'] = "You've already voted.";
	else if ($result == -4) $el['text'] = "You cannot stack votes across stations.  Please wait.";
	else if ($result == -5) $el['text'] = "Candidate entry does not exist.";
	else if ($result == -6) $el['text'] = "Election has already been decided.";
	else if ($result == -7) $el['text'] = "You cannot vote on that election this early.";
	else if ($result == -8) $el['text'] = "Wrong station.  Please switch to the appropriate station.";
	addOutput("voteresult", $el);
}
else if ($_GET['act'] == "rate") {
	$result = submitRating($_GET['rating_type'], $_GET['id'], $_GET['rating']);
	$el = array();
	$el['code'] = $result;
	$writeresult = false;
	if ($result == 1) { $el['text'] = "Rating submitted."; $writeresult = true; }
	else if ($result == 0) { $el['text'] = "Site error while submitting rating."; $writeresult = true; }
	else if ($result == -1) $el['text'] = "You must be logged in to rate.";
	else if ($result == -2) $el['text'] = "You must be tuned in to rate.";
	else if ($result == -3) $el['text'] = "Invalid category specified.";
	else if ($result == -4) $el['text'] = "Invalid song/album ID specified.";
	else if ($result == -5) $el['text'] = "Invalid rating specified.";
	else if ($result == -6) $el['text'] = "You must have been tuned in to that song to rate it.";
	else if ($result == -7) $el['text'] = "You must wait to rate when switching between stations.";
	if ($writeresult) {
		$el['rating_type'] = $_GET['rating_type'];
		$el['id'] = $_GET['id'];
		$el['rating'] = $_GET['rating'];
	}
	addOutput("rateresult", $el);
}
else if ($_GET['act'] == "fav") {
	$result;
	if ($_GET['fav'] == "true") $result = setFavouriteOn($_GET['fav_type'], $_GET['id']);
	else if ($_GET['fav'] == "false") $result = setFavouriteOff($_GET['fav_type'], $_GET['id']);
	$el = array();
	$el['code'] = $result;
	$writeresult = false;
	$favourite = false;
	if (($result == 1) && ($_GET['fav'] == "true")) {
		$el['text'] = "Favourited.";
		$writeresult = true;
		$favourite = true;
	}
	else if (($result == 1) && ($_GET['fav'] == "false")) {
		$el['text'] = "Un-favourited.";
		$writeresult = true;
		$favourite = false;
	}
	else if ($result == 0) { $el['text'] = "Site error while favouriting."; }
	else if ($result == -1) $el['text'] = "You must be logged in to use favourite.";
	else if ($result == -2) $el['text'] = "Invalid category specified.";
	else if ($result == -3) $el['text'] = "Invalid song/album ID specified.";
	if ($writeresult) {
		$el['fav_type'] = $_GET['fav_type'];
		$el['id'] = $_GET['id'];
		$el['favourite'] = $favourite;
	}
	addOutput("favresult", $el);
}
else if ($_GET['act'] == "favoff") {
	$result = setFavouriteOff($_GET['fav_type'], $_GET['id']);
	$el = array();
	$el['code'] = $result;
	$writeresult = false;
	if ($result == 1) { $el['text'] = "Favourited."; $writeresult = true; }
	else if ($result == 0) { $el['text'] = "Site error while favouriting."; $writeresult = true; }
	else if ($result == -1) $el['text'] = "You must be logged in to favourite.";
	else if ($result == -2) $el['text'] = "You must be tuned in to rate.";
	else if ($result == -3) $el['text'] = "Invalid category specified.";
	else if ($result == -4) $el['text'] = "Invalid song/album ID specified.";
	if ($writeresult) {
		$el['fav_type'] = $_GET['fav_type'];
		$el['id'] = $_GET['id'];
	}	
	addOutput("favonresult", $el);
}
else if ($_GET['act'] == "login") {
	require($phpbb_root_path . 'includes/functions_user.' . $phpEx);
	require($phpbb_root_path . 'includes/functions_module.' . $phpEx);

	$auth->acl($user->data);
	//$user->setup();
	$username	= request_var('username', '', true);
	$autologin	= ($_GET['autologin'] == "true") ? true : false;
	$password	= request_var('password', '', true);
	$admin 		= 0;
	$viewonline = $user->data['session_viewonline'];

	$result = $auth->login($username, $password, $autologin, $viewonline, $admin);

	$el = array();
	if ($result['status'] == LOGIN_SUCCESS) {
		$el['code'] = 1;
		$el['text'] = "Login successful.";
		globalizeUserData();
		rw_atx("full");
	}
	else if (($result['error_msg'] == "LOGIN_ERROR_PASSWORD") || ($result['error_msg'] == "LOGIN_ERROR_USERNAME")) {
		$el['code'] = 0;
		$el['text'] = "Invalid user or password.";
	}
	else if ($result['status'] == LOGIN_ERROR_ATTEMPTS) {
		$el['code'] = -1;
		$el['text'] = "Too many login attempts.  Please use the forums.";
	}
	else {
		$el['code'] = -2;
		$el['text'] = "Login error.  Please use the forums.";
	}
	addOutput("loginresult", $el);
}
else if ($_GET['act'] == "marknews") {
	$result = markNews($_GET['topic_id']);
	addOutput("marknewsresult", array("topic_id" => $_GET['topic_id'], "code" => $result));
}
else if ($_GET['act'] == "getrequests") {
	rw_atx("requests");
}
else {
	addOutput("error", array("text" => "No action specified."));
}

doOutput();
cleanUp();

?>
