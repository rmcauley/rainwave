#!/usr/bin/php
<?php
$dest = "/var/www/rainwave.cc/test/";
require("make.php");

exec("sudo chmod u+r /var/www/rainwave.cc/test -R");
exec("sudo chown www-data /var/www/rainwave.cc/test -R");
?>