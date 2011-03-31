<?php

header("content-type: application/xhtml+xml");

require("common.php");

print "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<head>
	<title>Rainwave API Key Management</title>
	<meta http-equiv="Content-Type" content="application/xhtml+xml; charset=UTF-8" />
	<link rel="stylesheet" href="http://rainwave.cc/~rain/lyre/api.css" type="text/css" />
	<style type="text/css">
	th {
		text-align: left;
		border-bottom: 1px solid #AAA;
	}
	
	td {
		border-bottom: 1px solid #666;
		padding: .1em .3em;
	}
	</style>
</head>
<body>
<?php
if ($user_id == 1) {
	print "<p>Anonymous users cannot manage keys.</p>";
	print "</body></html>";
}

if ($_GET['new'] == "true") {
	newAPIKey();
	print "<p class='ok'>New API key created.</p>";
}
if (isset($_GET['delete'])) {
	if (preg_match("/^\d+$/", $_GET['delete'])) {
		$valid = db_single("SELECT COUNT(*) FROM rw_apikeys WHERE user_id = " . $user_id . " AND api_isrw = FALSE AND api_id = " . $_GET['delete']);
		if ($valid == 1) {
			db_update("DELETE FROM rw_apikeys WHERE api_id = " . $_GET['delete']);
			print "<p class='ok'>API key deleted.</p>";
		}
		else {
			print "<p class='warn'>No valid API key found for that ID.</p>";
		}
	}
	else {
		print "<p class='warn'>Invalid API key ID provided for deletion.</p>";
	}
}
?>
<h2>Rainwave API Key Management</h2>
<p>Rainwave API Keys are a piece of text that you give to another app or website that authorizes them to use your Rainwave account for radio purposes.  Authorized apps or sites will never have access to modify your forums account (e.g. password or email), or other API keys, but they will have access to vote, rate, or request for you.</p>
<p>Here you can see which keys you have available and delete ones you don't use anymore, or delete ones you suspect may be abusing your account.  It is recommended you use 1 key per external application in the event that an application or site does abuse your account.</p>
<p>You must also give the app or website your user ID.</p>

<p>Your (<?php print $username; ?>'s) User ID: <b style='font-size: 1.5em; font-style: italic;'><?php print $user_id; ?></b></p>

<table>
<tr><th>Key</th><th>Delete</th></tr>

<?php

$result = $db->sql_query("SELECT api_id, api_key FROM rw_apikeys WHERE user_id = " . $user_id . " AND api_isrw = FALSE ORDER BY api_id");
while ($row = $db->sql_fetchrow($result)) {
	print "<tr><td>" . $row['api_key'] . "</td><td><a href='?delete=" . $row['api_id'] . "'>Delete</a></td></tr>";
}
$GLOBALS['db']->sql_freeresult($result);

?>
<tr><td>**</td><td><a href='?new=true'>Create New Key</a></td></tr>
</table>
</body>
</html>
