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
	<style type="text/css">
	body {
		background: black;
		color: white;
	}
	
	a, a:visited, a:hover {
		color: aqua;
	}
	
	h2 {
		border-bottom: 1px solid #fff;
	}
	
	th {
		text-align: left;
		border-bottom: 1px solid #AAA;
	}
	
	td {
		border-bottom: 1px solid #666;
		padding: .1em .3em;
		vertical-align: top;
	}
	</style>
</head>
<body>
<?php
if ($user_id == 1) {
	print "<p>Anonymous users cannot manage keys.</p>";
	print "</body></html>";
	exit(0);
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
<p>Rainwave API keys are a piece of text.  You must give keys to other Rainwave applications you want to use before they are able to talk to Rainwave.</p>
<ol>
	<li>Create a key using the link below.</li>
	<li>On a smartphone, click the QR code and then scan it.</li>
	<li>If not, write down your user ID (shown below in green) in the app, then write down your key into the app.</li>
</ol>
<p>Some notes:</p>
<ul>
	<li>API keys are generated randomly.</li>
	<li>Your account details cannot be seen or changed. (email, password, etc).  We value your privacy.</li>
	<li>It is recommended you use 1 API key per application.</li>
</ul>

<p><b><?php print $username; ?>'s User ID: <b style='font-size: 1.5em; color: #0F0;'><?php print $user_id; ?></b></b></p>

<h2><?php print $username; ?>'s Keys</h2>

<table>
<tr><th>Key</th><th>Delete</th><th>QR</th></tr>

<?php

$result = $db->sql_query("SELECT api_id, api_key FROM rw_apikeys WHERE user_id = " . $user_id . " AND api_isrw = FALSE ORDER BY api_id");
while ($row = $db->sql_fetchrow($result)) {
	$mini_qr_url = sprintf(MINI_QR_SERVICE, urlencode("rw://{$user_id}:{$row['api_key']}@rainwave.cc"));
	$qr_url = sprintf(QR_SERVICE, urlencode("rw://{$user_id}:{$row['api_key']}@rainwave.cc"));
	print "<tr><td>" . $row['api_key'] . "</td><td><a href='?delete=" . $row['api_id'] . "'>Delete</a></td><td><a href='"
		. htmlspecialchars($qr_url) . "'><img src='" . htmlspecialchars($mini_qr_url) . "' /></a></td></tr>\n";
}
$GLOBALS['db']->sql_freeresult($result);

?>
<tr><td>**</td><td><a href='?new=true'>Create New Key</a></td></tr>
</table>
</body>
</html>
