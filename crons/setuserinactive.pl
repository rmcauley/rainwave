#!/usr/bin/perl

use DBI;
my $dsn = 'DBI:Pg:dbname=rainwave';
my $db_user_name = 'orpheus';
my $db_password = 'iD7mie7U';
my $dbh = DBI->connect($dsn, $db_user_name, $db_password);
my $sth;

$sth = $dbh->prepare("UPDATE phpbb_users SET radio_inactive = TRUE WHERE radio_lastactive < " . (time() - 2592000));
$sth->execute();
$sth->finish();

$dbh->disconnect();
