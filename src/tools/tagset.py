#!/usr/bin/env python3

import argparse
import math
import os
from mutagen.mp3 import EasyMP3

from src.backend.rainwave.playlist import Song
from src.scanner.filemonitor import _is_mp3
from libs import config

parser = argparse.ArgumentParser(
    description="Read and set tags using Rainwave's ID3 tag code.  You can read or set tags by listing files or directories.  Directory tagging is recursive."
)
parser.add_argument(
    "paths", nargs="+", type=str, help="File(s) or directory(s) to read."
)
parser.add_argument("--album")
parser.add_argument("--artist")
parser.add_argument("--group")
parser.add_argument("--title")

shell_args = parser.parse_args()
config.set_value("scanner_use_tracknumbers", True)


def scan_file(args: argparse.Namespace, filename: str) -> None:
    if _is_mp3(filename):
        update_tag(args, filename)

        s = Song()
        s.load_tag_from_file(filename)

        print()
        print("--- %s" % filename)
        print("Title".ljust(10), ":", s.data["title"])
        print("Album".ljust(10), ":", s.album_tag)
        print("Artist".ljust(10), ":", s.artist_tag)
        print("CD Group".ljust(10), ":", s.genre_tag)
        print("Link Name".ljust(10), ":", s.data["link_text"])
        print("Link".ljust(10), ":", s.data["url"])
        print(
            "Length".ljust(10),
            ":",
            "%s:%02u"
            % (int(math.floor(s.data["length"] / 60)), (s.data["length"] % 60)),
        )


def scan_directory(args: argparse.Namespace, dirname: str) -> None:
    for root, _subdirs, files in os.walk(dirname, followlinks=True):
        for filename in files:
            scan_file(args, os.path.join(root, filename))


def update_tag(args: argparse.Namespace, filename: str) -> None:
    if args.album or args.artist or args.group or args.title:
        s = EasyMP3(filename)
        if args.album:
            s["album"] = str(args.album)
        if args.artist:
            s["artist"] = str(args.artist)
        if args.group:
            s["genre"] = str(args.group)
        if args.title:
            s["title"] = str(args.title)
        s.save()


if __name__ == "__main__":
    for f in shell_args.paths:
        if os.path.isfile(f):
            scan_file(shell_args, f)
        elif os.path.isdir(f):
            scan_directory(shell_args, f)
