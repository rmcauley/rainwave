<?php

require("jsmin.php");
require("cssmin.php");

$skincolors = array();
$validskins = array();
$devkey = "";
$devuid = "";
$devsid = "";
$devlyre = "";

function getBuildNumber($suffix = "") {
	$bnum = file_get_contents("buildnum" . $suffix);
	str_replace("\n", "", $bnum);
	return intval($bnum);
}

function bumpBuildNumber($suffix = "") {
	$bnum = getBuildNumber() + 1;
	$d = fopen("buildnum" . $suffix, 'w') or die("Can't open buildnum file to write.");
	fwrite($d, $bnum);
	fclose($d);
}

function removeOldBuild($dest) {
	print "Cleaning old build.\n";
	$dir = opendir($dest);
	if (!$dir) {
		print "No previous Rainwave build to clean, the above error message is OK to ignore.\n";
		print "Making Rainwave build dir.\n";
		mkdir($dest, 0755, true) or die("Could not create build destination: " . $dest . "\n");
		return;
	}
	while (false !== ($file = readdir($dir))) {
        if (is_dir($dest . $file) && preg_match("/^(lang|skins)_r\d*$/", $file)) {
			exec("rm -rf \"" . $dest . $file . "\"");
		}
		else if (preg_match("/^rainwave3_r\d*.js$/", $file)) {
			exec("rm -rf \"" . $dest . $file . "\"");
		}
    }
	closedir($dir);
}

function writeParsedFile($source, $dest, $bnum) {
	print "Building " . $dest . ".\n";
	$d = fopen($dest, 'w') or die("Can't open " . $dest);
	$s = fopen($source, "r") or die("Can't open " . $source);
	$desc = "\$rwdesc = " . var_export($GLOBALS['rwdesc'], true) . ";";
	$skins = "\$validskins = " . var_export($GLOBALS['validskins'], true) . ";";
	while (($buffer = fgets($s, 4096)) !== false) {
		$buffer = str_replace("<%BUILDNUM%>", $bnum, $buffer);
		$buffer = str_replace("<%LANGFUNC%>", file_get_contents("langfunc.php"), $buffer);
		$buffer = str_replace("<%RWDESC%>", $desc, $buffer);
		$buffer = str_replace("<%VALIDSKINS%>", $skins, $buffer);
		$buffer = str_replace("<%DEVAPIKEY%>", $GLOBALS['devkey'], $buffer);
		$buffer = str_replace("<%DEVUSERID%>", $GLOBALS['devuid'], $buffer);
		$buffer = str_replace("<%DEVSID%>", $GLOBALS['devsid'], $buffer);
		$buffer = str_replace("<%DEVLYREURL%>", $GLOBALS['devlyre'], $buffer);
		fwrite($d, $buffer);
    }
	fclose($s);
	fclose($d);
}

function copyStatic($dest, $bnum) {
	print "Copying static files.\n";
	copyFile("root/tunein.php", "tunein.php", $dest);
	copyFile("root/donations.php", "donations.php", $dest);
	copyDirectory("auth", "auth", $dest);
	copyDirectory("images", "images", $dest);
}

$rwdesc = array();
function buildLanguages($dest, $bnum) {
	print "Building languages.\n";
	require("lang/en_CA.php");
	$errs = false;
	if (isset($GLOBALS['langstatus']) && ($GLOBALS['langstatus'] == true)) {
		copyFile("lang/en_CA.php", "en_CA.php.txt", $dest . "langstatus/");
		$errs = fopen($dest . "langstatus/1_STATUS.txt", "w");
	}
	$dest2 = $dest . "lang_r" . $bnum;
	mkdir($dest2) or die("Can't make destination language directory.");
	$dir = opendir("lang");
	while (false !== ($file = readdir($dir))) {
        if (preg_match("/.php$/", $file) && ($file != "en_CA.php")) {
			$lang2 = array();
			$filenoext = substr($file, 0, (strlen($file) - 4));
			require("lang/" . $file);
			if (isset($lang2['_SITEDESCRIPTIONS'])) {
				$GLOBALS['rwdesc'][$filenoext] = $lang2['_SITEDESCRIPTIONS'];
			}
			if (isset($GLOBALS['langstatus'])) copyFile("lang/" . $file, $file . ".txt", $dest . "langstatus/");
			$fl = array_merge($lang, $lang2);
			writeLang($dest2 . "/" . $filenoext . ".js", $fl);
			
			if ($errs != false) {
				$missingany = false;
				foreach ($lang as $key => $value) {
					if (!isset($lang2[$key])) {
						if (!$missingany) {
							fwrite($errs, "*** $file Missing ***\n");
							$missingany = true;
						}
						fwrite($errs, "\t\"$key\" => \"" . $lang[$key] . "\",\n");
					}
				}
				if ($missingany) fwrite($errs, "\n");
			}
		}
    }
	if ($errs != false) fclose($errs);
	require("lang/en_CA.php.local");
	$GLOBALS['rwdesc']['en_CA'] = $lang['_SITEDESCRIPTIONS'];
	writeLang($dest2 . "/en_CA.js", $lang);
}

function writeLang($destfile, $fl) {
	$d = fopen($destfile, 'w') or die("Can't open javascript destination.");
	fwrite($d, "var lang = {");
	$commad = false;
	foreach ($fl as $key => $value) {
		if ($key == "_SITEDESCRIPTIONS") continue;
		if ($commad == false) $commad = true;
		else fwrite($d, ",");
		fwrite($d, "\"" . $key . "\":\"" . addslashes($value) . "\"");
	}
	fwrite($d, "}");
	fclose($d);
}

function buildProdSkins($dest, $bnum) {
	print "Building production skins.\n";
	$dir = opendir("skins") or die ("Can't read skins.");
	$dest2 = $dest . "skins_r" . $bnum;
	mkdir($dest2) or die ("Can't make destination skins directory.");
	while (false !== ($skin = readdir($dir))) {
		if (($skin == ".") || ($skin == "..")) {
			# pass
		}
        else if (is_dir("skins/" . $skin)) {
			array_push($GLOBALS['validskins'], $skin);
			$skindir = opendir("skins/" . $skin) or die("Can't open " . $skin . " skin directory.");
			mkdir($dest2 . "/" . $skin) or die("Can't create " . $skin . " skin directory.");
			require("skins/" . $skin . "/colors.php");
			while (false !== ($file = readdir($skindir))) {
				if (($file == ".") || ($file == "..")) {
					# pass
				}
				else if (preg_match("/.js$/", $file)) {
					$d = fopen($dest2 . "/" . $skin . "/" . $file, 'w') or die("Can't open destination file.");
					fwrite($d, JSMin::minify(file_get_contents("skins/" . $skin . "/" . $file)));
					fclose($d);
				}
				else if (preg_match("/.css$/", $file)) {
					appendCSSFile("skins/" . $skin . "/" . $file, "skins/" . $skin);
				}
				else if (is_dir("skins/" . $skin . "/" . $file)) {
					copyDirectory("skins/" . $skin . "/" . $file, $dest2 . "/" . $skin . "/" . $file, "");
				}
				/*else {
					copyFile("skins/" . $skin . "/" . $file, $dest2 . "/" . $skin . "/" . $file, "");
				}*/
			}
			compressTempCSS($dest2 . "/" . $skin . "/" . $skin . ".css");
			unlink("/tmp/rwcss");
		}
    }
}

function buildBetaSkins($dest, $bnum) {
	print "Building beta skins.\n";
	$dir = opendir("skins") or die ("Can't read skins.");
	$dest2 = $dest . "skins_r" . $bnum;
	mkdir($dest2) or die ("Can't make destination skins directory.");
	while (false !== ($skin = readdir($dir))) {
		if (($skin == ".") || ($skin == "..")) {
			# pass
		}
        else if (is_dir("skins/" . $skin)) {
			array_push($GLOBALS['validskins'], $skin);
			$skindir = opendir("skins/" . $skin) or die("Can't open " . $skin . " skin directory.");
			mkdir($dest2 . "/" . $skin) or die("Can't create " . $skin . " skin directory.");
			require("skins/" . $skin . "/colors.php");
			while (false !== ($file = readdir($skindir))) {
				if (($file == ".") || ($file == "..")) {
					# pass
				}
				else if (preg_match("/.js$/", $file)) {
					$d = fopen($dest2 . "/" . $skin . "/" . $skin . ".js", "a");
					fwrite($d, file_get_contents("skins/" . $skin . "/" . $file));
					fclose($d);
				}
				else if (preg_match("/.css$/", $file)) {
					appendCSSFile("skins/" . $skin . "/" . $file, "skins/" . $skin);
				}
				else if (is_dir("skins/" . $skin . "/" . $file)) {
					copyDirectory("skins/" . $skin . "/" . $file, $dest2 . "/" . $skin . "/" . $file, "");
				}
				/*else {
					copyFile("skins/" . $skin . "/" . $file, $dest2 . "/" . $skin . "/" . $file, "");
				}*/
			}
			copyFile("/tmp/rwcss", $dest2 . "/" . $skin . "/" . $skin . ".css");
			unlink("/tmp/rwcss");
		}
    }
}

function compressTempCSS($destfile) {
	$d = fopen($destfile, 'w') or die("Can't open destination file $destfile.");
	fwrite($d, CssMin::minify(file_get_contents("/tmp/rwcss")));
	fclose($d);
}

function appendCSSFile($sourcefile, $skindir) {
	print "Building CSS file $sourcefile.\n";
	$css = fopen($sourcefile, "r") or die("Can't open CSS file $sourcefile.");
	$d = false;
	$d = fopen("/tmp/rwcss", 'a') or die("Can't open destination file /tmp/rwcss");
	while (($buffer = fgets($css, 4096)) !== false) {
		$wrote = false;
		$matches = array();
		while (preg_match("/\[% ([A-Za-z0-9_]+) %\]/", $buffer, $matches)) {
			$buffer = preg_replace("/\[% [A-Za-z0-9_]+ %\]/", $GLOBALS['skincolors'][$matches[1]], $buffer, 1);
		}
		if (preg_match("/^(.*) url\(['\"]?([\w.-_]+).(png|jpg|gif|jpeg)['\"]?\)(.*)$/", $buffer, $matches)) {
			$filename = $skindir . "/" . $matches[2] . "." . $matches[3];
			if (filesize($filename) <= 5128) {
				$image = fopen($filename, "rb") or die("Could not open image $filename.");
				$contents = fread($image, filesize($filename));
				fclose($image);
				fwrite($d, $matches[1] . " url(data:image/" . $matches[3] . ";base64," . base64_encode($contents) . ")" . $matches[4]);
				$wrote = true;
			}
		}
		if (!$wrote) {
			fwrite($d, $buffer);
		}
	}
	if (!feof($css)) {
		die("Error: unexpected fgets() fail on $sourcefile");
	}
	fclose($css);
	fclose($d);
}

function copyFile($source, $dest, $destdir = "") {
	print "Copying file " . $source . "\n";
	if (!copy($source, $destdir . $dest)) {
		print "*** Could not copy file " . $source . " to " . $dest . ": exiting.\n";
		exit(0);
	}
}

function copyDirectory($source, $dest, $destdir) {
	print "Copying directory " . $source . "\n";
	$phpisdumb = array();
	unset($phpisdumb);
	$return = 1;
	if (file_exists($destdir . $dest)) {
		exec("rm -rf " . $destdir . $dest);
	}
	exec("cp -r " . $source . " " . $destdir . $dest, $phpisdumb, $return);
	if ($return != 0) {
		print "*** Could not copy directory " . $source . " to " . $dest . ": " . $return . ".\n";
		exit(0);
	}
}

function minifyJavascript($dest, $bnum) {
	print "Minifying and joining JS.\n";
	$d = fopen($dest . "rainwave3_r" . $bnum . ".js", 'w') or die("Can't open javascript destination.");
	for ($i = 0; $i < count($GLOBALS['jsorder']); $i++) {
		fwrite($d, JSMin::minify(file_get_contents($GLOBALS['jsorder'][$i])));
	}
	fclose($d);
}

function makeAPIDirectory($lyredir, $destdir) {
	print "Making API directory.\n";
	copyDirectory($lyredir . "docs", "api", $destdir);
	copyFile($lyredir . "javascript/lyre-ajax.js", "api/lyre-ajax.js", $destdir);
}

function crushPNG() {
	print "Crushing images.\n";
	$images = array();
	exec("find images skins -name *.png", $images);
	for ($i = 0; $i < count($images); $i++) {
		exec("optipng -q -o7 '" . $images[$i] . "'");
		exec("pngcrush -q -rem gAMA -rem cHRM -rem iCCP -rem sRGB -rem time '" . $images[$i] . "' /tmp/pngcrush.png");
		rename("/tmp/pngcrush.png", $images[$i]) or die("Could not move /tmp/pngcrush.png to " . $images[$i]);
	}
}

?>
