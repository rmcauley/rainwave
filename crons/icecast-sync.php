<?php

require("/var/www/rainwave.cc/auth/common.php");

$iceservers = array(
		#array(name => "Tanaric", site => "rw", "sid" => 1, url => "http://admin:oTdrdrCZNfy3@173.255.122.200:8000/admin/listclients?mount=/rainwave.ogg"),
		array(name => "Lyfe", site => "rw", "sid" => 1, url => "http://ice-admin:horseshavehooves@69.94.104.182:8000/admin/listclients?mount=/rainwave.ogg"),
        array(name => "Lyfe2", site => "rw", "sid" => 1, url => "http://ice-admin:horseshavehooves@69.94.108.98:8000/admin/listclients?mount=/rainwave.ogg"),
		array(name => "TanaricBackup", site => "rw", "sid" => 1, url => "http://admin:oTdrdrCZNfy3@173.164.249.97:8000/admin/listclients?mount=/rainwave.ogg"),
		
        array(name => "Dracoirs", site => "oc", "sid" => 2, url => "http://admin:ic3rc%40st@69.16.138.218:8000/admin/listclients?mount=/ocremix.ogg"),
		array(name => "Lyfe", site => "oc", "sid" => 2, url => "http://ice-admin:horseshavehooves@69.94.104.182:8000/admin/listclients?mount=/ocremix.ogg"),
		array(name => "Lyfe2", site => "oc", "sid" => 2, url => "http://ice-admin:horseshavehooves@69.94.108.98:8000/admin/listclients?mount=/ocremix.ogg"),
		
        array(name => "Rainwave", site => "vw", "sid" => 3, url => "http://liquidrain:bunnies@127.0.0.1:8000/admin/listclients?mount=/mixwave.ogg")
	);

foreach ($iceservers as $iceserver) {
	print "\nSyncing " . $iceserver['name'] . ".\n";
	if ($xmlurl = fopen($iceserver['url'], "r")) {
		$clients = array();
		$clistids = array();
		$clistids = db_table("SELECT list_icecast_id FROM rw_listeners WHERE list_relay = '" . $iceserver['name'] . "' AND list_purge = FALSE ORDER BY list_icecast_id", $clistids);
		foreach ($clistids as $row) {
			//print "\tDB Client: " . $row['clist_icecast_id'] . "\n";
			array_push($clients, $row['list_icecast_id']); 
		}
		$xmlraw = stream_get_contents($xmlurl);
		fclose($xmlurl);
		$xml = new SimpleXMLElement($xmlraw);
		$ids = array();
		foreach ($xml->source->listener as $listener) {
			//print "\tIce Client: " . $listener->ID . "\n";
			array_push($ids, $listener->ID);
		}

		foreach ($clients as $dbid) {
			if (count(preg_grep("/^" . $dbid . "$/", $ids)) == 0) {
				print "\tClient ID $dbid does not exist on " . $iceserver['name'] . " Icecast server.\n";
				db_update("UPDATE rw_listeners SET list_purge = TRUE WHERE list_relay = '" . $iceserver['name'] . "' AND list_icecast_id = " . $dbid);
			}
		}

		foreach ($ids as $id) {
			if (count(preg_grep("/^" . $id . "$/", $clients)) == 0) {
				print "\tClient ID $id from " . $iceserver['name'] . " does not exist in local database.\n";
			}
		}
	}
	else {
		print "Sync failed on " . $iceserver['name'] . ".\n";
	}
}

cleanUp();
