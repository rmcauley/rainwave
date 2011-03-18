<?php

if ((strpos($_SERVER['HTTP_USER_AGENT'], "MSIE 8") !== false) || (strpos($_SERVER['HTTP_USER_AGENT'], "MSIE 7") !== false) || (strpos($_SERVER['HTTP_USER_AGENT'], "MSIE 6") !== false)) {
	header("content-type: text/plain");
	print "Your browser is unsupported.  Please upgrade to IE9, or switch to Firefox or Chrome.\n";
	print "Your browser is: " . $_SERVER['HTTP_USER_AGENT'] . "\n\n";
	print "You can download M3U files by going to:\n";
	print "http://rw.rainwave.cc/tunein.php for Rainwave\n";
	print "http://ocr.rainwave.cc/tunein.php for OCR Radio\n";
	print "http://mix.rainwave.cc/tunein.php for Mixwave\n\n";
	print "Our forums are accessible to all browsers at http://rainwave.cc/forums";
	exit(0);
}

header("content-type: application/xhtml+xml");

require("auth/common.php");

print "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<head>
	<title><?php print $site; ?></title>
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
	?>
</head>
<body id="body">
<script type="text/javascript">
<?php
	print "\tvar PRELOADED_APIKEY = '" . newAPIKey(true) . "';\n";
	print "\tvar PRELOADED_USER_ID = " . $user_id . ";\n";
	print "\tvar PRELOADED_SID = " . $sid . ";\n";
	print "\tvar BUILDNUM = <%BUILDNUM%>;\n";
?>
</script>
<?php
	print "<div id='oggpixel'></div>\n";
	print "<script src='lang_r" . $bnum . "/" . $lang . ".js' type='text/javascript' async='true'></script>\n";
	print "<script src='skins_r" . $bnum . "/" . $skin . "/" . $skin . ".js' type='text/javascript' async='true'></script>\n";
?>
<script src='rainwave3_r<%BUILDNUM%>.js' type='text/javascript' async="true"></script>
<script type="text/javascript" src="http://www.google-analytics.com/ga.js"></script> 
<script type="text/javascript">
	pageTracker = _gat._getTracker("UA-3567354-1");
	pageTracker._initData();
	pageTracker._trackPageview();
</script>
</body>
</html>
