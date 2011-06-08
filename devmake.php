#!/usr/bin/php
<?php

require("buildfunc.php");
require("files.php");
if (!stat("devconf.php")) die("You must create a devconf.php file.  Please read the README.\n");
require("devconf.php");

$dest = $devdest;
if (gethostname() == "substream") {
	$dest = "/home/rmcauley/r3/beta/";
}
$bnum = getBuildNumber();

print "RAINWAVE 3 BETA REVISION " . $bnum . "\n";

removeOldBuild($dest);
copyStatic($dest, $bnum);
buildLanguages($dest, $bnum);
buildBetaSkins($dest, $bnum);
copyDirectory("js", "js", $dest);

$lyrejs = false;
if (!isset($devlyrejs) || !$devlyrejs) {
	$mtime = filemtime("/tmp/lyre-ajax.js");
	if (!$mtime || ($mtime < (time() - 86400))) {
		print "Fetching fresh copy of lyre-ajax.js, above error message is OK.\n";
		$lyrejs = file_get_contents("http://rainwave.cc/api/lyre-ajax.js");
		if (!$lyrejs) die("Could not obtain lyre-ajax.js from any sources.");
		$lyreout = fopen("/tmp/lyre-ajax.js", "w") or die("Could not cache local copy of lyre-ajax at /tmp/lyre-ajax.js");
		fwrite($lyreout, $lyrejs);
		fclose($lyreout);
	}
	else {
		print "Using cached copy of lyre-ajax.js.\n";
		$lyrejs = file_get_contents("/tmp/lyre-ajax.js");
	}
}
else {
	print "Using local copy of lyre-ajax.js at " . $devlyrejs . ".\n";
	$lyrejs = file_get_contents($devlyrejs, "r");
	if (!$lyrejs) die("Could not obtain local lyre-ajax.js copy.");
}
$lyreout = fopen($dest . "lyre-ajax.js", "w");
fwrite($lyreout, $lyrejs);
fclose($lyreout);

writeParsedFile("root/dev-index.php", $dest . "index.php", $bnum);
copyFile("files.php", "files.php", $dest);

?>
