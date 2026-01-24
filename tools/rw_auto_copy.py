#!/usr/bin/env python3

import argparse
import os
import os.path
import errno
import shutil
import time
from datetime import datetime

from libs import config


def mkdir_p(path: str) -> None:
    try:
        os.makedirs(path)
    except OSError as exc:  # Python >2.5
        if exc.errno == errno.EEXIST and os.path.isdir(path):
            pass
        else:
            raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Rainwave Power Hour generation script."
    )
    parser.add_argument("--config", default=None)
    args = parser.parse_args()
    config.load(args.config)

    now = datetime.now()
    upcoming = os.path.join(
        "~upcoming",
        "{}-{month:02d}-{day:02d}".format(now.year, month=now.month, day=now.day),
    )
    source = os.path.join(config.get("monitor_dir"), upcoming)
    if not os.path.isdir(source):
        print("No songs for {}".format(source))
    else:
        for root, subdirs, files in os.walk(source, followlinks=True):
            if root == source:
                continue

            directory_to = root.replace("{}{}".format(upcoming, os.sep), "")
            mkdir_p(directory_to)
            print(directory_to)
            time.sleep(10)

            for f in files:
                f_from = os.path.join(root, f)
                f_to = os.path.join(directory_to, f)
                print("    {}".format(f_to))
                shutil.move(f_from, f_to)
