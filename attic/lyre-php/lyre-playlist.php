<?php

if (isset($_GET['xml'])) header("Content-type: text/xml");
else header("Content-type: application/json");

require("lyre-common.php");
require("lyre-web.php");
require("lyre-playlist-lib.php");

if ($_GET['act'] == "playlist_album") {
	if (!preg_match("/^\d+$/", $_GET['album_id'])) {
		addOutput("error", array("text" => "Invalid album ID."));
	}
	else if (db_single("SELECT COUNT(*) FROM " . TBL_ALBUMS . " WHERE album_verified = TRUE AND album_id = " . $_GET['album_id']) == 0) {
		addOutput("error", array("text" => "Album does not exist."));
	}
	else {
		addOutput("album", getWholeAlbum($_GET['album_id']));
	}
}
elseif ($_GET['act'] == "playlist") {
	addOutput("playlistalbums", getAllAlbums());
}
else {
	addOutput("error", array("text" => "No action specified."));
}

doOutput();
cleanUp();
?>
