<?php
if (isset($_GET['xml'])) header("Content-type: text/xml");
else header("Content-type: application/json");

require("lyre-common.php");
require("lyre-web.php");
require("lyre-live-lib.php");

if ($_GET['act'] == "liveget") {
	addOutput("live_shows", getLiveShows());
}
else if ($_GET['act'] == "livestart") {
	$el = array();
	$result = startLiveShow($_GET['sched_id']);
	$el['code'] = $result;
	if ($result == 1) $el['text'] = "Live show enabled.";
	else if ($result == 0) $el['text'] = "Could not update schedule ID.";
	else if ($result == -1) $el['text'] = "Invalid schedule ID.";
	else if ($result == -2) $el['text'] = "Schedule ID already used.";
	else if ($result == -3) $el['text'] = "Wrong schedule type.";
	else if ($result == -4) $el['text'] = "Event does not belong to you.";
	addOutput("livestartresult", $el);
}
else if ($_GET['act'] == "livenew") {
	$el = array();
	$result = addLiveShow($_GET['epochtime'], $_GET['name'], $_GET['notes'], $_GET['user_id'], $_GET['type'], $_GET['length']);
	$el['code'] = $result;
	if ($result == 1) {
		$el['text'] = "Live show added.";
		$el['sched_type'] = $_GET['type'];
		updateLiveShows();
		addOutput("live_shows", getLiveShows());
	}
	else if ($result == 0) $el['text'] = "Could not add event to schedule.";
	else if ($result == -1) $el['text'] = "Data does not pass validation.";
	else if ($result == -2) $el['text'] = "Not authorized to add shows/blocks.";
	else if ($result == -3) $el['text'] = "Pause already schedule.";
	addOutput("livenewresult", $el);
	
}
else if ($_GET['act'] == "liveend") {
	$el = array();
	$result = endLiveShow($_GET['sched_id']);
	$el['code'] = $result;
	if ($result == 1) {
		$el['text'] = "Live show stopped.";
		addOutput("live_shows", getLiveShows());
	}
	else if ($result == 0) $el['text'] = "Could not update schedule ID.";
	else if ($result == -1) $el['text'] = "Invalid schedule ID.";
	else if ($result == -2) $el['text'] = "Schedule ID already used.";
	else if ($result == -3) $el['text'] = "Wrong schedule type.";
	else if ($result == -4) $el['text'] = "Event does not belong to you.";
	addOutput("liveendresult", $el);	
}
else if ($_GET['act'] == "livedelete") {
	$el = array();
	$result = deleteLiveShow($_GET['sched_id']);
	$el['code'] = $result;
	if ($result == 1) {
		$el['text'] = "Live show deleted.";
		$el['sched_id'] = $_GET['sched_id'];
		addOutput("live_shows", getLiveShows());
	}
	else if ($result == 0) $el['text'] = "Could not delete schedule ID.";
	else if ($result == -1) $el['text'] = "Invalid schedule ID.";
	else if ($result == -2) $el['text'] = "You cannot delete live shows.";
	addOutput("livedeleteresult", $el);
}
else if ($_GET['act'] == "oneshotnew") {
	$el = array();
	$result = addOneShot($_GET['song_id']);
	$el['code'] = $result;
	if ($result == 1) $el['text'] = "One shot added.";
	else if ($result == 0) $el['text'] = "Could not add schedule event.";
	else if ($result == -1) $el['text'] = "Invalid song ID.";
	else if ($result == -2) $el['text'] = "You have no live permissions.";
	else if ($result == -3) $el['text'] = "Invalid song.";
	else if ($result == -4) $el['text'] = "Queue is at maximum.";
	addOutput("oneshotnewresult", $el);
}
else if ($_GET['act'] == "oneshotdelete") {
	$el = array();
	$result = deleteOneShot($_GET['sched_id']);
	$el['code'] = $result;
	if ($result == 1) $el['text'] = "One shot deleted.";
	else if ($result == 0) $el['text'] = "Could not delete one shot.";
	else if ($result == -1) $el['text'] = "Invalid schedule ID.";
	else if ($result == -2) $el['text'] = "You do not have the rights.";
	else if ($result == -3) $el['text'] = "Schedule ID is not a one shot.";
	else if ($result == -4) $el['text'] = "Schedule ID has already played.";
	addOutput("oneshotdeleteresult", $el);
}
else if ($_GET['act'] == "forcecandidatenew") {
	$el = array();
	$result = addForceCandidate($_GET['song_id']);
	$el['code'] = $result;
	if ($result == 1) $el['text'] = "Force candidate added.";
	else if ($result == 0) $el['text'] = "Could not add force candidate.";
	else if ($result == -1) $el['text'] = "Invalid Song ID.";
	else if ($result == -2) $el['text'] = "Invalid rights.";
	else if ($result == -3) $el['text'] = "Invalid song.";
	addOutput("forcecandidatenewresult", $el);
}
else if ($_GET['act'] == "forcecandidatedelete") {
	$el = array();
	$result = deleteForceCandidate();
	$el['code'] = $result;
	if ($result == 1) $el['text'] = "Forced candidate deleted.";
	else if ($result == 0) $el['text'] = "Could not delete forced candidate.";
	else if ($result == -1) $el['text'] = "Invalid command ID.";
	else if ($result == -2) $el['text'] = "Insufficient rights.";
	else if ($result == -3) $el['text'] = "Wrong station.";
	else if ($result == -4) $el['text'] = "Not a force candidate command.";
	else if ($result == -5) $el['text'] = "Command already used.";
	addOutput("forcecandidatedeleteresult");
}
else {
	addOutput("error", array("text" => "No action specified."));
}
doOutput();
cleanUp();

?>