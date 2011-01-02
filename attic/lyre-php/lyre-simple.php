<?php

# Obtained from http://www.bin-co.com/php/scripts/array2json/
# This is useful because the default json_encode spits numbers out in quotes
# it also doesn't handle PostgreSQL's "t" and "f" for booleans 
function arrayToJSON(array $arr) {
	$parts = array();
	$is_list = false;

	if (count($arr) > 0) {
		// Find out if the given array is a numerical array
		$keys = array_keys($arr);
		$max_length = count($arr)-1;
		if (($keys[0] === 0) && ($keys[$max_length] === $max_length)) {//See if the first key is 0 and last key is length - 1
			$is_list = true;
			for($i=0; $i<count($keys); $i++) { //See if each key correspondes to its position
				if($i !== $keys[$i]) { //A key fails at position check.
					$is_list = false; //It is an associative array.
					break;
				}
			}
		}
			
		foreach($arr as $key=>$value) {
			$str = ( !$is_list ? '"' . $key . '":' : '' );
			if(is_array($value)) { //Custom handling for arrays
				$parts[] = $str . arrayToJSON($value);
			} else {
				//Custom handling for multiple data types
				if (is_numeric($value)){
					$str .= $value; //Numbers
				} elseif(is_bool($value)) {
					$str .= ( $value ? 'true' : 'false' );
				} elseif( $value === null ) {
					$str .= 'null';
				} elseif ( $value === "t" ) {
					$str .= 'true';
				} elseif ( $value === "f" ) {
					$str .= 'false';
				} else {
					$value = str_replace("\\", "\\\\", $value);
					$value = str_replace("\"", "\\\"", $value);
					$value = str_replace("/", "\\/", $value);
					$str .= '"' . $value . '"'; //All other things
				}
				$parts[] = $str;
			}
		}
	}
	$json = implode(',',$parts);

	if($is_list) return '[' . $json . ']';//Return numerical JSON
	return '{' . $json . '}';//Return associative JSON
}

header("Content-type: application/json");

$memcached = new Memcache;
$memcached->pconnect('localhost', 11211);

$sid;
if ($_GET['site'] == "rw") $sid = 1;
else if ($_GET['site'] == "oc") $sid = 2;
else if ($_GET['site'] == "vw") $sid = 3;

print "{";
if (($_GET['act'] == "ce") || ($_GET['act'] == "all")) print "\"sched_current\":" . arrayToJSON($memcached->get($sid . "_current_event"));
if ($_GET['act'] == "all") print ",";
if (($_GET['act'] == "ne") || ($_GET['act'] == "all")) print "\"sched_next\":" . arrayToJSON($memcached->get($sid . "_next_events"));
if ($_GET['act'] == "all") print ",";
if (($_GET['act'] == "le") || ($_GET['act'] == "all")) print "\"sched_history\":" . arrayToJSON($memcached->get($sid . "_last_events"));
print "}";

?>
