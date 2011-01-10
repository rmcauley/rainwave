#!/usr/bin/php
<?php

require("buildfunc.php");
require("files.php");

if (isset($_SERVER['argv'][1])) {
	bumpBuildNumber();
}

$dest = "/home/rmcauley/r3/beta/";
$bnum = getBuildNumber();
$lyredir = "/home/rmcauley/lyre/";

print "RAINWAVE 3 BETA REVISION " . $bnum . "\n";

removeOldBuild($dest);
writeParsedFile("root/preload.php", $dest . "preload.php", $bnum);
copyStatic($dest, $bnum);

print "Copying languages and skins.\n";
copyDirectory("lang", "lang_r" . $bnum, $dest);
copyDirectory("skins", "skins_r" . $bnum, $dest);
print "Copying lyre-ajax.js.\n";
copyFile($lyredir . "javascript/lyre-ajax.js", "lyre-ajax.js", $dest);
print "Copying javascript.\n";
copyDirectory("js", "js", $dest);
print "Copying index.php.\n";
copyFile("root/beta-index.php", "index.php", $dest);
print "Copying files.php.\n";
copyFile("files.php", "files.php", $dest);

?>
