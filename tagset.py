#!/usr/bin/python

import argparse
from rainwave.song import Song

parser = argparse.ArgumentParser(description="Read or set tags using Rainwave's ID3 tag code.  To set tags, supply any on the commandline.")
parser.add_argument("file", metavar='N', help = "File or directory. (recursive)")
parser.add_argument("--album")
parser.add_argument("--artist")
parser.add_argument("--genre")
parser.add_argument("--track")
parser.add_argument("--title")
parser.add_argument("--length")
parser.add_argument("--year")

args = parser.parse_args()

s = Song.load_from_file(args.file)

for k, v in s.tag.iteritems():
	print "%s: %s" % (k, v)