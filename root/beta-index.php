<?php

if ((strpos($_SERVER['HTTP_USER_AGENT'], "MSIE 8") !== false) || (strpos($_SERVER['HTTP_USER_AGENT'], "MSIE 7") !== false) || (strpos($_SERVER['HTTP_USER_AGENT'], "MSIE 6") !== false)) {
	header("content-type: text/plain");
	print "Your browser is unsupported.  Please upgrade to IE9, or switch to Firefox or Chrome.";
	exit(0);
}

header("content-type: application/xhtml+xml");

require("auth/common.php");

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
	<title>Rainwave Beta</title>
	<meta http-equiv="Content-Type" content="application/xhtml+xml; charset=UTF-8" />
	<?php
		$bnum = <%BUILDNUM%>;
		$skin = "RWClassic";
		$lang = "en_CA";
		if (isset($_COOKIE['r3prefs'])) {
			$cookie = json_decode($_COOKIE['r3prefs'], true);
			if (isset($cookie['edi']['theme']['value'])) $skin = $cookie['edi']['theme']['value'];
			if (isset($cookie['edi']['language']['value'])) $lang = $cookie['edi']['language']['value'];
		}
		print "<link rel=\"stylesheet\" href='skins_r" . $bnum . "/" . $skin . "/" . $skin . ".css' type='text/css' />\n";
		print "\t<script src='lang_r" . $bnum . "/" . $lang . ".js' type='text/javascript'></script>\n";
	?>
	<script src="lyre-ajax.js" type="text/javascript"></script>
</head>
<body id="body">
<?php
	print "<script type=\"text/javascript\">\n";
	print "\tvar PRELOADED_APIKEY = '" . newAPIKey(true) . "';\n";
	print "\tvar PRELOADED_USER_ID = " . $user_id . ";\n";
	print "\tvar PRELOADED_SID = " . $sid . ";\n";
	print "\tvar BUILDNUM = <%BUILDNUM%>;\n";
	print "</script>\n";
	
	//print "<div id='oggpixel'></div>\n";
	print "<script src='skins_r" . $bnum . "/" . $skin . "/" . $skin . ".js' type='text/javascript'></script>\n";
	for ($i = 0; $i < count($jsorder); $i++) {
		print "<script src='" . $jsorder[$i] . "' type='text/javascript'></script>\n";
	}
	/*print "<div id='IMAGE_PRELOAD' style='position: absolute; top: -5000px; left: -5000px; width: 1px; height: 1px;'>\n";
	$dir = opendir("images") or die ("Can't read images directory.");
	while (false !== ($img = readdir($dir))) {
		if (($img != ".") && ($img != "..") && (!strpos($img, ".swf"))) {
			print "<img src='images/" . $img . "' alt=''/>";
		}
	}
	closedir($dir);
	$dir = opendir("skins_r" . $bnum . "/" . $skin . "/images") or die ("Can't read skins directory.");
	while (false !== ($img = readdir($dir))) {
		if (($img != ".") && ($img != "..")) {
			print "<img src='skins_r" . $bnum . "/" . $skin . "/images/" . $img . "' alt=''/>";
		}
	}
	closedir($dir);
	print "\n</div>\n";*/
?>
</body>
</html>
