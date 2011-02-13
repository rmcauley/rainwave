#!/usr/bin/php
<?php

require("buildfunc.php");
require("files.php");

$dest = "/var/www/rainwave.cc/test/";
$bnum = getBuildNumber();
$lyredir = "../lyre/";

print "RAINWAVE 3 LIVE REVISION " . $bnum . "\n";

// Add lyre-ajax to the large lump JS file
array_unshift($jsorder, $lyredir . "javascript/lyre-ajax.js");

removeOldBuild($dest);
crushPNG();
writeParsedFile("root/preload.php", $dest . "preload.php", $bnum);
copyStatic($dest, $bnum);
buildSkins($dest, $bnum);
buildLanguages($dest, $bnum);
minifyJavascript($dest, $bnum);
writeParsedFile("root/index.php", $dest . "index.php", $bnum);

//makeAPIDirectory($lyredir, $dest, false);

?>