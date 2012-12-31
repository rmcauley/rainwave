#!/usr/bin/php
<?php

require("buildfunc.php");
require("files.php");

if (isset($_SERVER['argv'][1])) {
	bumpBuildNumber();
}

$dest = "/var/www/rainwave.cc/beta/";
$bnum = getBuildNumber();
$langstatus = true;
$cookiedomain = 'rainwave.cc';

print "RAINWAVE 3 BETA REVISION " . $bnum . "\n";

removeOldBuild($dest);
copyStatic($dest, $bnum);
buildLanguages($dest, $bnum);
buildBetaSkins($dest, $bnum);
copyDirectory("js", "js", $dest);
writeParsedFile("root/beta-index.php", $dest . "index.php", $bnum);
copyFile("files.php", "files.php", $dest);
copyDirectory("ffmp3", "ffmp3", $dest);

?>
