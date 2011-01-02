<?php
header("Content-type: application/json");

require("common.php");

require($phpbb_root_path . 'includes/functions_user.' . $phpEx);
require($phpbb_root_path . 'includes/functions_module.' . $phpEx);

$auth->acl($user->data);
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
addOutput("login_result", $el);
doOutput();
cleanUp();

?>
