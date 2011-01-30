#!/usr/bin/perl -w

open(MP3GAIN, "mp3gain -s r -s s \"" . $ARGV[0] . "\" |");
while (<MP3GAIN>) {
	print $_;
	if ($_ =~ /Recommended "Track" dB change: (-?\d+\.\d+)/) {
		print "Changing to " . sprintf("%0.2f", $1) . " on " . $ARGV[0] . ".\n";
		system("/usr/local/bin/tagset rg \"" . sprintf("%0.2f", $1) . "\" \"" . $ARGV[0] . "\"");
	}
}
close (MP3GAIN);
