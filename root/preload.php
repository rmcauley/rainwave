<?php

header("content-type: text/javascript");

require("auth/common.php");
globalizeUserData();

print "var PRELOADED_APIKEY = '" . newAPIKey(true) . "';\n";
print "var PRELOADED_USER_ID = " . $user_id . ";\n";
print "var PRELOADED_SID = " . $sid . ";\n";
print "var BUILDNUM = <%BUILDNUM%>;\n";

?>