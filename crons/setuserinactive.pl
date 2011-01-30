#!/usr/bin/perl

my $dsn = 'DBI:mysql:rainwave:localhost';
my $db_user_name = 'raincast';
my $db_password = 'ahgh0Toh';

my $dbh = DBI->connect($dsn, $db_user_name, $db_password);

$sth = $dbh->prepare("UPDATE phpbb_users SET radio_inactive = TRUE WHERE radio_lastactive < " . (time() - 2592000));
$sth->execute();
$sth->finish();

$dbh->disconnect();
