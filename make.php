#!/usr/bin/php
<?php

require("buildfunc.php");
require("files.php");

$bnum = getBuildNumber();
$lyredir = "../lyre/";

if (!isset($dest)) {
	$dest = "/var/www/rainwave.cc/";
	print "RAINWAVE 3 LIVE REVISION " . $bnum . "\n";
}
else {
	print "RAINWAVE 3 TEST REVISION " . $bnum . "\n";
}

// Add lyre-ajax to the large lump JS file
array_unshift($jsorder, $lyredir . "javascript/lyre-ajax.js");

removeOldBuild($dest);
crushPNG();
copyStatic($dest, $bnum);
buildProdSkins($dest, $bnum);
buildLanguages($dest, $bnum);
minifyJavascript($dest, $bnum);
writeParsedFile("root/index.php", $dest . "index.php", $bnum);
chmod($dest . "auth/common.php", "755");
copyDirectory("ffmp3", "ffmp3", $dest);

makeAPIDirectory($lyredir, $dest, false);

exec("chmod u+r $dest/auth -R");
exec("chown www-data $dest/auth -R");
exec("chmod o+r $dest/auth/common.php");

?>
