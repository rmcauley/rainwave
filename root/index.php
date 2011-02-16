<?php
header("content-type: application/xhtml+xml");

define("RW", 1);
define("OCR", 2);
define("VW", 3);
define("MW", 3);

$sid = RW;
if ($_COOKIE['r3sid'] == "1") $sid = RW;
else if ($_COOKIE['r3sid'] == "2") $sid = OCR;
else if ($_COOKIE['r3sid'] == "3") $sid = VW;
// This gives precedence to URL if using a subdomained station
if ($_SERVER['HTTP_HOST'] == "rw.rainwave.cc") $sid = RW;
else if ($_SERVER['HTTP_HOST'] == "ocr.rainwave.cc") $sid = OCR;
else if ($_SERVER['HTTP_HOST'] == "ocremix.rainwave.cc") $sid = OCR;
else if ($_SERVER['HTTP_HOST'] == "mix.rainwave.cc") $sid = VW;
else if ($_SERVER['HTTP_HOST'] == "mixwave.rainwave.cc") $sid = VW;
else if ($_SERVER['HTTP_HOST'] == "vwave.rainwave.cc") $sid = VW;
// An override, mostly for administration uses
if ($_GET['site'] == "rw") $sid = RW;
else if ($_GET['site'] == "oc") $sid = OCR;
else if ($_GET['site'] == "mw") $sid = VW;
else if ($_GET['site'] == "vw") $sid = VW;

if ($sid == 1) $site = "Rainwave";
if ($sid == 2) $site = "OCR Radio";
if ($sid == 3) $site = "Mixwave";

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
		print "\t<script src='lang_r" . $bnum . "/" . $lang . ".js' type='text/javascript'></script>\n";
	?>
	<script src="preload.php?site=<?php print $_GET['site'] ?>" type="text/javascript"></script>
</head>
<body id="body">
<div id="oggpixel"></div>
<div id="IMAGE_PRELOAD" style="position: absolute; top: -5000px; left: -5000px; width: 1px; height: 1px;">
	<?php
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
		print "\n";
	?>
</div>
<?php print "<script src='skins_r" . $bnum . "/" . $skin . "/" . $skin . ".js' type='text/javascript'></script>\n"; ?>
<script src='rainwave3_r<%BUILDNUM%>.js' type='text/javascript'></script>
<script type="text/javascript">
		var gaJsHost = (("https:" == document.location.protocol) ? "https://ssl." : "http://www.");
		document.write(unescape("%3Cscript src='" + gaJsHost + "google-analytics.com/ga.js' type='text/javascript'%3E%3C/ script%3E"));
</script>
<script type="text/javascript">
		var pageTracker = _gat._getTracker("UA-3567354-1");
		pageTracker._initData();
		pageTracker._trackPageview();
</script>
</body>
</html>
