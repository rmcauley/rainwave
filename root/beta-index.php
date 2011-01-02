<?php

header("content-type: application/xhtml+xml");

require("auth/common.php");
globalizeUserData();

if (!in_array($userdata['group_id'], array(5, 4, 8, 12, 15, 14))) {
	print "<body>You are not allowed to see this page.</body>";
	exit(0);
}

require("files.php");

print "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";

?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<head>
	<title>Rainwave 3</title>
	<meta http-equiv="Content-Type" content="application/xhtml+xml; charset=UTF-8" />
</head>
<body id="body">
<script src="preload.php" type="text/javascript"></script>
<script src="lyre-ajax.js" type="text/javascript"></script>
<?php
	for ($i = 0; $i < count($jsorder); $i++) print "<script src=\"" . $jsorder[$i] . "\" type=\"text/javascript\"></script>\n";
?>
<!--<object id="oggpixel" type="application/x-shockwave-flash" data="js/oggpixel/oggpixel.swf" width="1" height="1"><param name="allowScriptAccess" value="always" /></object>-->
</body>
</html>
