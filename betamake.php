#!/usr/bin/php
<?php

require("buildfunc.php");
require("files.php");

if (isset($_SERVER['argv'][1])) {
	bumpBuildNumber();
}

$dest = "/var/www/rainwave.cc/beta/";
if (gethostname() == "substream") {
	$dest = "/home/rmcauley/r3/beta/";
}
$bnum = getBuildNumber();
$lyredir = "/home/rmcauley/lyre/";
$langstatus = true;
$cookiedomain = 'rainwave.cc';

print "RAINWAVE 3 BETA REVISION " . $bnum . "\n";

removeOldBuild($dest);
copyStatic($dest, $bnum);
buildLanguages($dest, $bnum);
buildBetaSkins($dest, $bnum);
copyFile($lyredir . "javascript/lyre-ajax.js", "lyre-ajax.js", $dest);
copyDirectory("js", "js", $dest);
writeParsedFile("root/beta-index.php", $dest . "index.php", $bnum);
copyFile("files.php", "files.php", $dest);
copyDirectory("ffmp3", "ffmp3", $dest);

?>
