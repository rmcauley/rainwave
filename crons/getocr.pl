#!/usr/bin/perl -w

# Usage
# getocr.pl update    -> Sync Ormgas to OCR
# getocr.pl ####      -> Re-get OCR #
# getocr.pl #### #### -> Get range of OCR

use strict;
use HTML::Entities;
use HTML::PullParser;
use warnings;

our $ormgasmax;
our $ocrmax = 0;
our $updatehappen = 0;

if (defined($ARGV[0]) && ($ARGV[0] eq "update")) {

	open(LAST, "/home/ocrmgr/ocr.max");
	$ormgasmax = <LAST>;
	chomp($ormgasmax);
	close(LAST);

	system("wget -q -O /tmp/ocrrss 'http://www.ocremix.org/feeds/ten091/'");

	open(RSS, "/tmp/ocrrss");
	while (<RSS>) {
		if ($_ =~ /OCR(\d+)/) {
			if ($1 > $ocrmax) { $ocrmax = $1; }
		}
	}
	close(RSS);
	unlink("/tmp/ocrrss");

	print "\nOrmgas: $ormgasmax / OCR: $ocrmax\n";
	if ($ormgasmax < $ocrmax) { $updatehappen = 1; }
}
elsif ($ARGV[0] =~ /^\d+$/) {
	$ormgasmax = $ARGV[0] - 1;
	$ocrmax = $ARGV[0];
	if (defined($ARGV[1])) {
		if (($ARGV[1] =~ /^\d+$/) && ($ARGV[1] > $ARGV[0])) {
			$ocrmax = $ARGV[1];
			$ormgasmax = $ARGV[0] - 1;
		}
		else {
			print "Invalid second argument.\n";
		}
	}
	$updatehappen = 1;
}
else {
	print "Usage:\n";
	print "getocr.pl update - Updates using 'ocr.max' file as start point\n";
	print "getocr.pl [OCR ID] - Fetches OCR ID remix\n";
	print "getocr.pl [start OCR ID] [end OCR ID] - Fetches range of OCRs\n";
	exit(0);
}

for (my $i = ($ormgasmax + 1); $i <= $ocrmax; $i++) {
	my ($title, $game, $filename);
	my $artists = "";

	print "Processing OCR #" . sprintf("%05u", $i) . ".\n";
	my $remixurl = "http://www.ocremix.org/remix/OCR" . sprintf("%05u", $i) . "/";
	system("wget -q -O /tmp/ocrhtml '$remixurl'");
	open (HTML, "<:utf8", "/tmp/ocrhtml"); # or print STDERR "Failed on " . $row[0] . "!\n";
	while (<HTML>) {
		if ($_ =~ /<h1>.*?<a href=\".*\">(.*?)<\/a>\s*'(.*?)'\s*<\/h1>/) {
		#if ($_ =~ /\<title\>ReMix: (.*?)\s+\'(.*)\'(?!.*\')/) {
			$game = $1;
			$title = $2;
		}
		if ($_ =~ /\<strong\>ReMixer\(s\)/) {
			my $stuff = $_;
			chomp($stuff);
			my @elements = split("<li>", $stuff);
			foreach my $el (@elements) {
				if ($el =~ /ReMixer\(s\)/) {
					my @artistel = split("</a>", $el);
					foreach my $el2 (@artistel) {
						if ($el2 =~ /\<a href=\".*\"\>(.*)/) {
							if ($artists eq "") { $artists = $1; }
							else { $artists .= ", $1"; }
						}
					}
				}
			}
		}
		if ($_ =~ /(http\:\/\/iterations\.org\/files\/music\/remixes\/)(.*)\.mp3/) {
			$filename = decode_entities($2);
			my $url = $1 . $2 . ".mp3";
			print "\tURL: $url\n";
			$filename =~ s/\%(\d\d)/chr(hex $1)/eg;
			system("wget -q -O /tmp/$i.mp3 '$url'");
			#print "Getting /home/rmcauley/ocr/" . $filename . ".mp3\n";
			#system("cp \"/home/rmcauley/ocr/" . $filename . ".mp3\" /tmp/$i.mp3");
			system("mp3gain -s d /tmp/$i.mp3");
			open(MP3GAIN, "mp3gain -s r -s s /tmp/$i.mp3 |");
			while (<MP3GAIN>) {
				print $_;
				if ($_ =~ /Recommended "Track" dB change: (-?\d+\.\d+)/) {
					print "Changing to " . sprintf("%0.2f", $1) . ".\n";
					system("/usr/local/bin/tagset rg \"" . sprintf("%0.2f", $1) . "\" /tmp/$i.mp3");
				}
			}
			close (MP3GAIN);
		}
	}
	close (HTML);

	$game = decode_entities($game);
	$title = decode_entities($title);
	$artists = decode_entities($artists);
	$artists =~ s/"/'/g;#"
	$title =~ s/"/'/g;#"
	$game =~ s/"/'/g;#"

	system("/usr/local/bin/tagset genre \"\" /tmp/$i.mp3");
	system("/usr/local/bin/tagset www \"$remixurl\" /tmp/$i.mp3");
	system("/usr/local/bin/tagset comment \"Remix Info @ OCR\" /tmp/$i.mp3");
	system("/usr/local/bin/tagset album \"$game\" /tmp/$i.mp3");
	system("/usr/local/bin/tagset artist \"$artists\" /tmp/$i.mp3");
	system("/usr/local/bin/tagset title \"$title\" /tmp/$i.mp3");

	my $safedir = $game;
	my $safefile = $filename;
	decode_entities($safedir);
	decode_entities($safefile);
	$safedir =~ tr/a-zA-Z0-9//cd;
	$safefile =~ tr/a-zA-Z0-9//cd;
	my $finaldest = "/home/icecast/ocr/music/";
	$finaldest .= "$safedir/";
	system("mkdir -p \"$finaldest\"");
	system("chmod 775 \"$finaldest\"");
	$finaldest .= "$safefile.mp3";

	print "\tFinal Dest: $finaldest\n\n";
	system("mv /tmp/$i.mp3 '$finaldest'");

	unlink("/tmp/ocrhtml");
}

if ($updatehappen == 1) {
	if (defined($ARGV[0]) && ($ARGV[0] eq "update")) {
		open(LAST, ">/home/ocrmgr/ocr.max");
		print LAST $ocrmax . "\n";
		close(LAST);
	}
	
	use DBI;
	my $dsn = 'DBI:Pg:dbname=rainwave';
	my $db_user_name = 'orpheus';
	my $db_password = 'iD7mie7U';
	my $dbh = DBI->connect($dsn, $db_user_name, $db_password);
	my $sth;
	$sth = $dbh->prepare("INSERT INTO rw_commands (sid, command_name) VALUES (2, 'regenplaylist')");
	$sth->execute();
	$sth->finish();
	$dbh->disconnect();
}
