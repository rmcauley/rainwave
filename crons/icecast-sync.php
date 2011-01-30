<?php

require("/var/www/rainwave.cc/raincast-web.php");

$iceservers = array(
	array(name => "Rainwave", site => "rw", url => "http://liquidrain:bunnies@127.0.0.1:8000/admin/listclients?mount=/stream.ogg"),
	array(name => "Dracoirs", site => "oc", url => "http://admin:ic3rc%40st@69.16.138.218:8000/admin/listclients?mount=/ormgas.ogg"),
	array(name => "Ormgas", site => "oc", url => "http://admin:dataSpyor2@213.67.132.98:8000/admin/listclients?mount=/ormgas.ogg"),
	array(name => "V-wave", site => "vw", url => "http://liquidrain:bunnies@127.0.0.1:8000/admin/listclients?mount=/vwave-src.ogg"),
	array(name => "GameOwls", site => "rw", url => "http://ice-admin:horseshavehooves@69.94.104.182:8000/admin/listclients?mount=/rainwave.ogg"),
	array(name => "GameOwls", site => "oc", url => "http://ice-admin:horseshavehooves@69.94.104.182:8000/admin/listclients?mount=/ocremix.ogg"),
	array(name => "Lyfe", site => "rw", url => "http://ice-admin:horseshavehooves@69.94.104.182:8000/admin/listclients?mount=/rainwave.ogg"),
	array(name => "Lyfe", site => "oc", url => "http://ice-admin:horseshavehooves@69.94.104.182:8000/admin/listclients?mount=/ocremix.ogg"),
	);

foreach ($iceservers as $iceserver) {
	if ($xmlurl = fopen($iceserver['url'], "r")) {
		print "Syncing " . $iceserver['name'] . ".\n";
		$clients = array();
		$clistids = array();
		bb_getResultSetFromDB("SELECT clist_icecast_id FROM " . $iceserver['site'] . "_currentlisteners2 WHERE clist_relay = '" . $iceserver['name'] . "' AND clist_purge = 0 ORDER BY clist_icecast_id", $clistids);
		foreach ($clistids as $row) {
			print "\tDB Client: " . $row['clist_icecast_id'] . "\n";
			array_push($clients, $row['clist_icecast_id']); 
		}
		$xmlraw = stream_get_contents($xmlurl);
		fclose($xmlurl);
		$xml = new SimpleXMLElement($xmlraw);
		$ids = array();
		foreach ($xml->source->listener as $listener) {
			print "\tIce Client: " . $listener->ID . "\n";
			array_push($ids, $listener->ID);
		}

		foreach ($clients as $dbid) {
			if (count(preg_grep("/^" . $dbid . "$/", $ids)) == 0) {
				print "\tClient ID $dbid does not exist on server.\n";
				bb_updateDB("DELETE FROM " . $iceserver['site'] . "_currentlisteners2 WHERE clist_icecast_id = $dbid");
			}
		}

		foreach ($ids as $id) {
			if (count(preg_grep("/^" . $id . "$/", $clients)) == 0) {
				print "\tClient ID $id does not exist in database.\n";
			}
		}
	}
	else {
		print "Sync failed on " . $iceserver['name'] . ".\n";
	}
}

cleanUp();
