#!/usr/bin/php
<?php

require("buildfunc.php");
require("files.php");

$dest = "/home/rmcauley/test/";
$bnum = getBuildNumber();
$lyredir = "../lyre/";

print "RAINWAVE 3 LIVE REVISION " . $bnum . " DEPLOYING\n";

array_unshift($jsorder, $lyredir . "javascript/lyre-ajax.js");

crushPNG();
removeOldBuild($dest);
writeParsedFile("root/preload.php", $dest . "preload.php", $bnum);
copyStatic($dest, $bnum);
makeAPIDirectory($lyredir, $dest, false);
buildSkins($dest, $bnum);
buildLanguages($dest, $bnum);
minifyJavascript($dest, $bnum);

writeParsedFile("root/live-index.xhtml", $dest . "index.xhtml", $dest);

?>