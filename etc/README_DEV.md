# Setting up a Rainwave development environment with Vagrant

## Overview

In general, this is what you need to do to quickly set up a local Rainwave
development server:

1.  Clone the Rainwave repository.
2.  Install VirtualBox and Vagrant.
3.  Specify the location of your music files.
4.  Launch the Rainwave dev server.
5.  Make API calls to the dev server.

These steps are explained in greater detail below.

## Clone the Rainwave repository

If you are not familiar with Git and GitHub, perhaps you are not a developer
and perhaps this guide is not for you.

Fork [the Rainwave repository][rw-repo] (if you have not done so already) and
clone your fork to your local computer. That is all.

[rw-repo]: https://github.com/rmcauley/rainwave

## Install VirtualBox and Vagrant

Because the Rainwave dev server will be running in a virtual machine on your
local computer, you need to install [VirtualBox][vb].

[vb]: https://www.virtualbox.org/

Download and install [Vagrant][]. Vagrant is a tool that manages the
Rainwave dev virtual machine. It makes setting up the initial environment
trivially simple, and also makes it easy to rebuild the dev server from scratch
if necessary.

[vagrant]: http://www.vagrantup.com/

## Specify the location of your music files.

The Rainwave server needs a directory full of MP3 files if you want to do any
meaningful development and testing. You need to specify the location of your
music files with an environment variable.

Set `RW_DEV_MUSIC_DIR` to the directory that contains your music. Music can
(and probably should) be divided into subdirectories in the main directory.

For example, I created a directory for my music at `~/Music/rw` and added this
line to `~/.bashrc`:

    export RW_DEV_MUSIC_DIR=~/Music/rw

You can also [set environment variables in Windows][ev-win].

[ev-win]: http://ss64.com/nt/syntax-variables.html

## Launch the Rainwave dev server

With VirtualBox and Vagrant installed, and your music directory location set,
you are ready to launch the dev server. **You must be connected to the Internet
the first time you launch the dev server.**

Open a terminal or command prompt, change to the directory where you cloned the
repository, and run this command:

    vagrant up

The first time you run this command, it will take a while because a lot of
things will happen:

1.  Vagrant will download a base virtual machine, configure it, and boot it.
2.  Inside the virtual machine, Vagrant will run a provisioning script that
    downloads and installs the dependencies required to run the Rainwave
    server.
3.  The provisioning script will set up the Rainwave database, scan the music
    directory you specified, and add those songs to the database.
4.  The provisioning script will start the Rainwave backend and API server
    processes.

Throughout this process, Vagrant will print diagnostic information to the
console.

Most of the initial startup time is spent downloading and installing
dependencies. For the curious, the virtual machine is running Ubuntu 14.04
64-bit. Some dependencies are installed from the Ubuntu repositories using
`aptitude`, and some are installed from the Python Package Index using `pip`.
For more details, inspect `etc/vagrant_provision.sh` in the repository.

Run `vagrant ssh` to ssh into the virtual machine. Run `vagrant halt` to shut
down the machine and `vagrant up` to start it again. The provisioning script
only runs automatically the first time the virtual machine boots.

After rebooting the virtual machine, or to restart the Rainwave server
processes without rebooting the virtual machine, run `vagrant provision`.

If something in the virtual machine breaks and you want to start over with a
clean dev server, `vagrant destroy` will erase all traces of the virtual
machine. Running `vagrant up` will then recreate the virtual machine. It will
take a long time because dependencies will need to be downloaded and installed
again.

## Make API calls to the dev server

With the Rainwave dev server running, you can now make API calls to it. Vagrant
forwards port 20000 on your host machine to the virtual machine. Open a browser
(on the host machine) and navigate to <http://localhost:20000/api4>. If
everything went according to plan, you should see the Rainwave API
Documentation.
