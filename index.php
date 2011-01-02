<?php

header("content-type: application/xhtml+xml");

require("../api/lyre-common.php");
require("../api/lyre-web.php");

if (userdata['radio_perks'] == 0) {
	print "<body>You are not allowed to see this page.</body>";
	exit(0);
}

require("dev-data.php");

print "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";

?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<head>
	<title>Rainwave 3</title>
	<meta http-equiv="Content-Type" content="application/xhtml+xml; charset=UTF-8" />
	<link rel="stylesheet" type="text/css" href="skins/RWClassic/RWClassic.css" />
</head>
<body id="body" style="font-family: Tahoma, Sans-Serif;	font-size: 0.8em;">
<script src="preload.php" type="text/javascript"></script>
<?php
	for ($i = 0; $i < count($jsorder); $i++) print "<script src=\"" . $jsorder[$i] . "\" type=\"text/javascript\"></script>\n";
?>
<!--<object id="oggpixel" type="application/x-shockwave-flash" data="js/oggpixel/oggpixel.swf" width="1" height="1"><param name="allowScriptAccess" value="always" /></object>-->
</body>
</html>
