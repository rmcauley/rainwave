#!/usr/bin/env python

import argparse

import backend.filemonitor
import libs.config
import libs.log
import libs.db
import libs.cache
import libs.chuser
import rainwave.playlist
import rainwave.playlist_objects.album

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Rainwave song scanning daemon.")
    parser.add_argument("--config", default=None)
    parser.add_argument("--full", action="store_true")
    parser.add_argument("--reset", action="store_true")
    parser.add_argument("--art", action="store_true")
    args = parser.parse_args()
    libs.config.load(args.config)
    if libs.config.get("log_level") == "print" and (args.art or args.full):
        libs.log.init(
            "%s/rw_scanner.log" % libs.config.get_directory("log_dir"), "debug"
        )
    else:
        libs.log.init(
            "%s/rw_scanner.log" % libs.config.get_directory("log_dir"),
            libs.config.get("log_level"),
        )

    for sid in libs.config.station_ids:
        rainwave.playlist_objects.album.clear_updated_albums(sid)

    if libs.config.get("scanner_user") and libs.config.get("scanner_group"):
        libs.chuser.change_user(
            libs.config.get("scanner_user"), libs.config.get("scanner_group")
        )

    try:
        libs.db.connect()
        libs.cache.connect()

        if args.art:
            backend.filemonitor.full_art_update()
        elif args.full:
            backend.filemonitor.full_music_scan(args.reset)
        else:
            backend.filemonitor.monitor()
    finally:
        libs.db.close()
        libs.log.close()
