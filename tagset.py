#!/usr/bin/python

import argparse
import math
from rainwave.playlist import Song
from libs import config

parser = argparse.ArgumentParser(description="Read tags using Rainwave's ID3 tag code.")
parser.add_argument("file", metavar='N', help = "File to read.")
parser.add_argument("--album")
parser.add_argument("--artist")
parser.add_argument("--genre")
parser.add_argument("--track")
parser.add_argument("--title")
parser.add_argument("--length")
parser.add_argument("--year")
parser.add_argument("--gain", action="store_true")

args = parser.parse_args()
config.set_value("mp3gain_scan", args.gain)

s = Song()
s.load_tag_from_file(args.file)

print "Title".ljust(10), ":", s.data['title']
print "Album".ljust(10), ":", s.album_tag
print "Artist".ljust(10), ":", s.artist_tag
print "Genre Tag".ljust(10), ":", s.genre_tag
print "Link Name".ljust(10), ":", s.data['link_text']
print "Link".ljust(10), ":", s.data['url']
print "Length".ljust(10), ":", "%s:%s" % (int(math.floor(s.data['length'] / 60)), (s.data['length'] % 60))
print "Gain".ljust(10), ":", s.replay_gain