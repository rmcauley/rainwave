#!/usr/bin/env python3

import os
import subprocess
from glob import glob
from os import path
from distutils.dir_util import copy_tree
from distutils.file_util import copy_file

from libs import config

user = "rainwave"
group = "www-data"

root = path.abspath(os.sep)
conf_file = path.join(root, "etc", "rainwave.conf")
install_dir = path.join(root, "opt", "rainwave")
install_static_baked_dir = path.join(install_dir, "static", "baked")

copy_dirs = [
    "api_requests",
    "api",
    "backend",
    "etc",
    "lang",
    "libs",
    "rainwave",
    "static",
    "templates",
]

copy_files = list(glob("rw_*.py")) + ["tagset.py", "Pipfile", "Pipfile.lock"]

services = [
    "rainwave-backend",
    "rainwave-api",
    "rainwave-scanner",
]

if __name__ == "__main__":
    if os.getuid() != 0:
        raise Exception("Installer must be run as root.")

    build_num = config.get_and_bump_build_number()

    print(f"Build number {build_num}")

    # actual baking is done on app start - check api/server.py
    try:
        os.makedirs(install_static_baked_dir, exist_ok=True)
    except FileExistsError:
        pass

    for dir_to_copy in copy_dirs:
        copy_tree(dir_to_copy, path.join(install_dir, dir_to_copy))

    for file_to_copy in copy_files:
        copy_file(file_to_copy, path.join(install_dir, file_to_copy))

    for service in services:
        service_file = f"{service}.service"
        copy_file(path.join("systemd", service_file), path.join(root, "etc", "systemd", "system", service_file))

    subprocess.call(["sudo", "systemctl", "daemon-reload"])

    subprocess.call(["chown", "-R", "%s:%s" % (user, group), install_dir])

    pwd = os.getcwd()
    os.chdir(install_dir)
    subprocess.call(["sudo", "--user=rainwave", "python3", "-m", "pipenv", "sync"])
    os.chdir(pwd)

    print(f"Rainwave installed to {install_dir}")

    for service in services:
        subprocess.check_call(["service", service, "restart"])
