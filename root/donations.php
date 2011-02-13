<?php require ("auth\common.php") ?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/2000/REC-xhtml1-20000126/DTD/xhtml1-transitional.dtd">
<html>

<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
	<meta http-equiv="Content-Style-Type" content="text/css" />

	<title>Rainwave Donations</title>

	<style type="text/css">
		body {
			margin: .2em !important;
			padding: 0em !important;
			overflow: auto;
			background: #000000;
			color: #FFFFFF;
		}
		
		h1, h2 {
			font-size: 1em;
			padding-bottom: 1px;
			border-bottom: solid 1px #CE8300;
			color: #FFC96A;
		}

		table.playlist {
			width: 100%;
			font-size: 1em;
			padding-top: 0px;
			margin-top: 0px;
		}

		table.playlist td {
			padding-left: 2px;
			background: #000000;
			border-bottom: solid 1px #3F667C;
		}

		table.playlist tr.titlerow td, table.playlist tr.titlerow:hover td {
			font-size: 1em;
			padding-bottom: 1px;
			margin-bottom: 2px;
			border-bottom: solid 1px #CE8300 !important;
			background: #000000 !important;
		}

		table.playlist td.pagetitle {
			font-weight: bold;
			color: #FFC96A;
		}
		
		table.playlist tr.headerrow td, table.playlist tr.headerrow:hover td {
			background: #3F667C;
			font-weight: bold;
		}
		
		table.playlist tr:hover td {
			background: #3D484F;
			border-bottom: solid 1px #7D94A1;
		}

		table.playlist tr:hover td span.rating_blank {
			color: #3D484F;
		}
	</style>

	</head>

<body>
<h2>Rainwave Donations</h2>
<ul><li>You can affix a personal note to go on this page. Just put it in your payment description.</li>
<li>You can specify that you want your name to be made public, if you wish. (keep in mind you'll be listed as a donor on the forums with a yellow name, just that the amount you donated cannot be publically tied to you)</li>
<li><b><span style='color: #FF4444'>Please note your username in the payment description</span></b> as well so that you may receive donor status.</li>
<li>You can donate in Canadian to save both of us money!  Just use the same email address you see on the Paypal page, and send in CAD!</li>
</ul>
<p>Rainwave will keep running even if the donation money runs out.  This is a "tip jar."  Donate what you want!</p>
<p>Donating is done through Robert "LiquidRain" McAuley's PayPal account.  Click on the PayPal icon below to donate.</p>
<div style='text-align: center'>
<form method="post" action="https://www.paypal.com/cgi-bin/webscr" target="paypal">
<input type="hidden" name="cmd" value="_xclick">
<input type="hidden" name="business" value="rmcauley@gmail.com">
<input type="hidden" name="item_name" value="">
<input type="hidden" name="bn"  value="ButtonFactory.PayPal.001">
<input type="image" name="add" src="images/paypal.gif">
</form>
</div>
<br />
<table class='playlist'>
<tr class='titlerow'><td class='pagetitle' colspan='2'>Statistics</td></tr>
<?php

$sitebal = db_value("SELECT SUM(donation_amount) FROM rw_donations");
$rwtotal = db_value("SELECT SUM(donation_amount) FROM rw_donations WHERE donation_amount > 0 AND user_id != 2");
$count = db_value("SELECT COUNT(*) FROM rw_donations WHERE donation_amount > 0 AND user_id != 2");

print "<tr><td><b>Rainwave Site Balance</b></td><td class='alignright'><b>" . sprintf("%0.2f", $sitebal) . "</b></td></tr>";
print "<tr><td>Donated to Rainwave</td><td class='alignright'>" . sprintf("%0.2f", $rwtotal) . "</td></tr>";
print "<tr><td>Total Number of Donations</td><td class='alignright'>" .  $count . "</td></tr>";
?>
</table>

<table class='playlist'>
<tr class='titlerow'><td class='pagetitle' colspan='4'>Last 50 Donations</td></tr>
<tr class='headerrow'><td>Username</td><td class='alignright' style='width: 10em; padding-right: 2em;'>Amount</td><td>Notes</td></tr>
<?php

$donations = array();
$donations = db_table("SELECT rw_donations.*, username FROM rw_donations JOIN phpbb_users USING (user_id) ORDER BY donation_id DESC LIMIT 50");
foreach ($donations as $donation) {
	print "<tr><td>";
	if ($donation['donation_private_name']) print "<span class='grey'>private</span>";
	else print $donation['username'];
	print "</td><td class='alignright' style='padding-right: 2em;'>";
	print sprintf("%0.2f", $donation['donation_amount']);
	print "</td><td>" . $donation['donation_desc'] . "</td>";
	print "</tr>";
}

cleanUp();

?>

</body>
</html>
