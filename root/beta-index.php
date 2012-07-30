<?php

header("content-type: text/html");

require("auth/common.php");

if (!in_array($userdata['group_id'], array(5, 4, 8, 12, 15, 14, 17))) {
	print "<body>Sorry, only donors and administrators may use the Rainwave beta. (which is often broken anyway)</body>";
	exit(0);
}

require("files.php");

// TODO: Lang should use dashes, not underscores. :/

$lang = getDefaultLanguage();

<%RWDESC%>
<%VALIDSKINS%>
//print "<?xml version=\"1.0\" encoding=\"UTF-8\" ? >";
//<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
//<html xmlns="http://www.w3.org/1999/xhtml" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
?>
<!DOCTYPE html>
<html lang="<?php print $lang ?>">
<head>
	<title>Rainwave Beta</title>
	<meta charset="UTF-8" />
	<?php 
		print "<meta name=\"description\" content=\"";
		if (isset($rwdesc[$lang])) print $rwdesc[$lang][$sid];
		else print $rwdesc['en_CA'][$sid];
		print "\" />";
	?>
	<%LANGFUNC%>
	<?php
		$bnum = <%BUILDNUM%>;
		$skin = "Rainwave";
		#print "<!--\n";
		if (isset($_COOKIE['r3prefs'])) {
			$cookie = json_decode($_COOKIE['r3prefs'], true);
			if (isset($cookie['edi']['language']['value'])) {
				$lang = $cookie['edi']['language']['value'];
				#print "preference language loaded instead: " . $lang . "\n";
			}
			if (isset($cookie['edi']['theme']['value']) && in_array($cookie['edi']['theme']['value'], $validskins)) { 
				$skin = $cookie['edi']['theme']['value'];
				#print "preference theme loaded: " . $skin . "\n";
			}
		}
		#print "\n-->\n";
		print "<link rel=\"stylesheet\" href='skins_r" . $bnum . "/" . $skin . "/" . $skin . ".css' type='text/css' />\n";
		print "\t<script src='lang_r" . $bnum . "/" . $lang . ".js' type='text/javascript'></script>\n";
	?>
	<script src="lyre-ajax.js" type="text/javascript"></script>
</head>
<body id="body">
<?php

	print "<script type=\"text/javascript\">\n";
	print "\tvar PRELOADED_LANG = '" . $lang . "';\n";
	print "\tvar PRELOADED_APIKEY = '" . newAPIKey(true) . "';\n";
	print "\tvar PRELOADED_USER_ID = " . $user_id . ";\n";
	print "\tvar PRELOADED_SID = " . $sid . ";\n";
	print "\tvar PRELOADED_LYREURL = '';\n";
	print "\tvar BUILDNUM = <%BUILDNUM%>;\n";
	print "\tvar COOKIEDOMAIN = 'rainwave.cc';\n";
	print "</script>\n";
	
	//print "<div id='oggpixel'></div>\n";
	print "<script src='skins_r" . $bnum . "/" . $skin . "/" . $skin . ".js' type='text/javascript'></script>\n";
	for ($i = 0; $i < count($jsorder); $i++) {
		print "<script src='" . $jsorder[$i] . "' type='text/javascript'></script>\n";
	}
?>
</body>
</html>
