# Rainwave Radio Controller

## Preface

This is the git project for the Rainwave website, http://rainwave.cc.

Rainwave is a system to control an external player such as MPD,
or a streaming source such as Ices or LiquidSoap.  It cannot play
or stream audio by itself.

The software stack and data flow for broadcasting:

* LiquidSoap asks Rainwave backend what song/MP3 file should be played
* Rainwave backend replies with a song/MP3 file
* LiquidSoap plays the song, encodes the stream, and sends the audio to Icecast
* Icecast distributes audio to users
* Icecast tells Rainwave API when users tune in/out

Rainwave only supports MP3 files.

## Prerequisites

Authentication for Rainwave in a production environment is dependant on phpBB.

If you are just testing/developing locally, Rainwave will automatically setup
some phpBB tables in the database and fill with some basic test data.  phpBB
and PHP are not required in this scenario.

phpBB and Rainwave must share the same database.  Some phpBB tables
are also modified for Rainwave's purposes as part of Rainwave's
database initialization, but do not interfere with phpBB.

If using Icecast, Icecast 2.3.3 or above is required.

If using LiquidSoap, LiquidSoap 1.1 or above is required.  If you want
to use the built-in web DJ functionality of Rainwave, LiquidSoap 1.2
or above is required.

### Prerequisites on Debian/Ubuntu

```
git clone git@github.com:rmcauley/rainwave.git
sudo apt-get install memcached postgresql-contrib python-pip python-psycopg2 python-mutagen python-nose python-imaging python-psutil python-unidecode python-pylibmc python-tornado python-meliae slimit python-fontforge python-dev libpython-dev
sudo pip install -r rainwave/requirements.txt
sudo pip install ujson
cp rainwave/etc/rainwave_reference.conf rainwave/etc/$USER.conf
```

### Prerequisites on Windows

* [Install Postgres 9.4 or above](http://www.postgresql.org/download/windows/) with extras/"contrib" option during install
* [Install Memcache for Windows](https://commaster.net/content/installing-memcached-windows), any version, and start it
* [Download and install Python 2.7 64-bit for Windows](https://www.python.org/download/), during install, select to add Python to your PATH
* [Download and install psycopg2 for 64-bit Python 2.7](http://www.stickpeople.com/projects/python/win-psycopg/)
* [Download and install psutil for 64-bit Python 2.7](https://pypi.python.org/pypi?:action=display&name=psutil#downloads)
* [Install setuptools](https://pypi.python.org/pypi/setuptools#installation-instructions)
* Make sure the Python Scripts directory is also on your PATH (i.e. easy_install)
* Clone/download the Rainwave repository to a folder
* Open a command shell to the folder and execute:

```
easy_install pip
pip install -r requirements.txt
```
* Copy etc/rainwave_reference.conf to etc/[your username].conf

## Postgres Setup For Testing/Development

If you are using a phpBB install for user authentication, **skip this step** and use
your existing phpBB database and database credentials.

Install Postgres, connect as a super user, and execute this SQL, using your own password:

```sql
CREATE ROLE rainwave WITH LOGIN WITH PASSWORD "[password]";
CREATE DATABASE rainwave WITH OWNER rainwave;
```

## Configure Rainwave

Edit your configuration file in the Rainwave etc/, and follow the instructions
within to setup your install.  Please read through the entire config, as every
option is important to the setup of your station(s).

Tips:

* Until you're ready to deploy a production version, it's best to leave development mode on and keep Rainwave single-processed.
* Start at Station ID 1 - Station 0 is not allowed.

## First Start and Test

Open a terminal/command line to your Rainwave repository directory.
You need to initialize the database and then add your songs to the database:

```
python db_init.py
python rw_scanner.py --full
```

Once done, open another terminal/command line and execute:

```
python rw_backend.api
```

This is the service that manages what song to play.
Once that is started successfully, open another terminal/command line:

```
python rw_api.py
```

The API provides the website, API, and image serving.
Once started, in your original terminal execute:

```
python rw_get_next.py
```

rw_get_next gets the next song to play from the backend.
If successful, you should see a song filename as output.

Open the beta URL at `/beta/?sid=1` to see your Rainwave.

If you are not running against an installed phpBB and want
to emulate being logged in, open `/api4/test/login_tuned_in/1`.

## Deploying to Production (Linux Only)

### Installing a Production Rainwave

Before running install.py:

With an existing phpBB install already ready, copy your Rainwave
configuration file to /etc/rainwave.conf and tune for production.
e.g. Turn off development modes, turn down logging, increase
number of processes to the number of CPUs you
have.

Rudimentary init scripts are included for sysvinit but are not
installed for you by default.  You can install
our initscripts with `sudo cp initscript /etc/init.d/rainwave`.

If use systemd and  create scripts for systemd,
please contribute back to us!
([GitHub Issue](https://github.com/rmcauley/rainwave/issues/99))

The install script will attempt to automatically run
`/etc/init.d/rainwave` with `start` and `stop` arguments if
the script exists.

`sudo python install.py` when ready, and Rainwave will be copied to
`/opt/rainwave`, and will minify and bundle Javascript to be put
into the "baked" static directory.

Rainwave depends on three daemons:

* `rw_backend.py` to act for LiquidSoap
* `rw_api.py` to act for browsers
* `rw_scanner.py` which monitors the filesystem for new/changed songs

### Updating a Running Rainwave

When updating Rainwave, to bust caches and make sure your users
are getting the latest code, you **have** to edit `etc/buildnum` and
increase the build number *before* install.py.  If you don't do this,
your users will continually run old code.

During installation, Rainwave has no safety mechanisms or rolling restarts.
Rainwave will appear to be shutdown for a few seconds to the outside
world while installing/updating.  If the restart fails, Rainwave will be
offline. ([GitHub Issue](https://github.com/rmcauley/rainwave/issues/95))

### Icecast and Listener Tune In/Out Recognition

For user tune in recognition to work, you have to use Icecast's
user authentication system.  Sample Icecast configurations are
included in Rainwave's etc/ directory.

### LiquidSoap Configuration

A sample LiquidSoap configuration is included in etc/.

## Developing The Front-End

Rainwave rebuilds CSS on each page load of /beta when
development mode is on, and /beta serves the Javascript without
minification or bundling.  No need for npm or any package managers
or watchers.

* HTML files for the index and admin panels can be found in /templates.
* HTML templates for the main site can be found in static/templates5.
* CSS files are in /static/style5 and the entry point is r5.scss.
* Image files are in /static/images4.
* JS files are in /static/js5:
  * Execution starts from main.js.
  * No libraries or frameworks are used
  * There are some helper functions in element.js and formatting.js

## Contact

You can get help for deployment and development through the main
developer, Rob, on the main Rainwave site forums and chat channel:

http://rainwave.cc/forums/
irc://irc.synirc.net://rainwave
