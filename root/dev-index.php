<?php

header("content-type: application/xhtml+xml");

require("files.php");

<%RWDESC%>
<%VALIDSKINS%>

print "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";

?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<head>
	<title>Rainwave Beta</title>
	<meta http-equiv="Content-Type" content="application/xhtml+xml; charset=UTF-8" />
	<%LANGFUNC%>
	<?php
		$bnum = <%BUILDNUM%>;
		$skin = "Rainwave";
		$lang = getDefaultLanguage();
		if (isset($_COOKIE['r3prefs'])) {
			$cookie = json_decode($_COOKIE['r3prefs'], true);
			if (isset($cookie['edi']['theme']['value']) && in_array($cookie['edi']['theme']['value'], $validskins)) $skin = $cookie['edi']['theme']['value'];
			if (isset($cookie['edi']['language']['value'])) $lang = $cookie['edi']['language']['value'];
		}
		print "<link rel=\"stylesheet\" href='skins_r" . $bnum . "/" . $skin . "/" . $skin . ".css' type='text/css' />\n";
		print "\t<script src='lang_r" . $bnum . "/" . $lang . ".js' type='text/javascript'></script>\n";
	?>
	<script src="lyre-ajax.js" type="text/javascript"></script>
</head>
<body id="body">
<div style="display: none;">
	<?php 
		if (isset($rwdesc[$lang])) print "\t" . $rwdesc[$lang][$sid] . "\n";
		else print "\t" . $rwdesc['en_CA'][$sid] . "\n";
	?>
</div>
<?php

	print "<script type=\"text/javascript\">\n";
	print "\tvar PRELOADED_LANG = '" . $lang . "';\n";
	print "\tvar PRELOADED_APIKEY = '<%DEVAPIKEY%>';\n";
	print "\tvar PRELOADED_USER_ID = <%DEVUSERID%>;\n";
	print "\tvar PRELOADED_LYREURL = <%DEVLYREURL%>;\n";
	print "\tvar PRELOADED_SID = <%DEVSID%>;\n";
	print "\tvar BUILDNUM = <%BUILDNUM%>;\n";
	print "</script>\n";
	
	//print "<div id='oggpixel'></div>\n";
	print "<script src='skins_r" . $bnum . "/" . $skin . "/" . $skin . ".js' type='text/javascript'></script>\n";
	for ($i = 0; $i < count($jsorder); $i++) {
		print "<script src='" . $jsorder[$i] . "' type='text/javascript'></script>\n";
	}
?>
</body>
</html>
