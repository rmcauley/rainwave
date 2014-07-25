#!/usr/bin/python

import argparse
import math
import os
from mutagen.mp3 import EasyMP3

from rainwave.playlist import Song
from backend.filemonitor import _is_mp3
from libs import config

parser = argparse.ArgumentParser(description="Read and set tags using Rainwave's ID3 tag code.  You can read or set tags by listing files or directories.  Directory tagging is recursive.")
parser.add_argument("paths", nargs="+", type=unicode, help="File(s) or directory(s) to read.")
parser.add_argument("--album")
parser.add_argument("--artist")
parser.add_argument("--group")
parser.add_argument("--title")
parser.add_argument("--gain", action="store_true")

args = parser.parse_args()
config.set_value("mp3gain_scan", args.gain)

def scan_file(args, filename):
	if _is_mp3(filename):
		update_tag(args, filename)

		s = Song()
		s.load_tag_from_file(filename)

		print
		print "--- %s" % filename
		print "Title".ljust(10), ":", s.data['title']
		print "Album".ljust(10), ":", s.album_tag
		print "Artist".ljust(10), ":", s.artist_tag
		print "CD Group".ljust(10), ":", s.genre_tag
		print "Link Name".ljust(10), ":", s.data['link_text']
		print "Link".ljust(10), ":", s.data['url']
		print "Length".ljust(10), ":", "%s:%s" % (int(math.floor(s.data['length'] / 60)), (s.data['length'] % 60))
		print "Gain".ljust(10), ":", s.replay_gain	

def scan_directory(args, dirname):
	for root, subdirs, files in os.walk(dirname.encode("utf-8"), followlinks = True):
		for filename in files:
			scan_file(args, os.path.join(root, filename))

def update_tag(args, filename):
	if args.album or args.artist or args.group or args.title:
		s = EasyMP3(filename)
		if args.album:
			s["album"] = unicode(args.album)
		if args.artist:
			s["artist"] = unicode(args.artist)
		if args.group:
			s["genre"] = unicode(args.group)
		if args.title:
			s["title"] = unicode(args.title)
		s.save()


if __name__ == "__main__":
	for f in args.paths:
		if os.path.isfile(f):
			scan_file(args, f)
		elif os.path.isdir(f):
			scan_directory(args, f)
