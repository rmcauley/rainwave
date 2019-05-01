# Rainwave Radio Controller

## Preface

This is the git project for the Rainwave website, http://rainwave.cc.

Rainwave is a system to control an external player such as MPD,
or a streaming source such as Ices or LiquidSoap. It cannot play
or stream audio by itself.

The software stack and data flow for broadcasting:

-   LiquidSoap asks Rainwave backend what song/MP3 file should be played
-   Rainwave backend replies with a song/MP3 file
-   LiquidSoap plays the song, encodes the stream, and sends the audio to Icecast
-   Icecast distributes audio to users
-   Icecast tells Rainwave API when users tune in/out

Rainwave only supports MP3 files.

## Prerequisites

Authentication for Rainwave users is dependant on phpBB.

-   If you want users to use your site for voting, rating, and requesting, you'll
    have to install the latest phpBB, 3.1 or above.
-   If you're just running Rainwave for streaming audio, you do not need phpBB.
-   If you are just testing/developing locally, you do not need phpBB.

phpBB and Rainwave must share the same database. Rainwave uses phpBB's
tables and data. If you do not have phpBB, Rainwave will create its own
fake phpBB data to put into the database.

If using Icecast, Icecast 2.3.3 or above is required.

If using LiquidSoap, LiquidSoap 1.1 or above is required. If you want
to use the built-in web DJ functionality of Rainwave, LiquidSoap 1.3
or above is required.

### Prerequisites on Debian/Ubuntu

```
git clone https://github.com/rmcauley/rainwave.git
sudo apt-get install memcached postgresql-contrib python-pip python-psycopg2 python-mutagen python-nose python-imaging python-psutil python-unidecode python-pylibmc python-tornado python-meliae slimit python-fontforge python-dev libpython-dev mp3gain
sudo pip install -r rainwave/requirements.txt
sudo pip install ujson
cp rainwave/etc/rainwave_reference.conf rainwave/etc/$USER.conf
```

### Prerequisites on Windows

-   [Install Postgres 11 or above](http://www.postgresql.org/download/windows/) with extras/"contrib" option during install
-   [Install Memcache for Windows](https://commaster.net/content/installing-memcached-windows), any version, and start it
-   [Download and install Python 2.7 64-bit for Windows](https://www.python.org/download/), during install, select to add Python to your PATH
-   [Download and install psycopg2 for 64-bit Python 2.7](http://www.stickpeople.com/projects/python/win-psycopg/)
-   [Download and install psutil for 64-bit Python 2.7](https://pypi.python.org/pypi?:action=display&name=psutil#downloads)
-   [Install setuptools](https://pypi.python.org/pypi/setuptools#installation-instructions)
-   Make sure the Python Scripts directory is also on your PATH (i.e. easy_install)
-   Clone/download the Rainwave repository to a folder
-   Open a command shell to the folder and execute:

```
easy_install pip
pip install -r requirements.txt
```

-   Copy `etc/rainwave_reference.conf` to `etc/[your username].conf`

## Postgres Setup For Testing/Development

If you are using a phpBB install for user authentication, **skip this step** and use
your existing phpBB database and database credentials.

-   On Windows, use PgAdmin to connect to your database, and open an SQL input window.
-   On most Linux installs, open an SQL prompt with `sudo -u postgres psql`.

Execute the following SQL, replacing the password with your own:

```
CREATE ROLE rainwave WITH LOGIN PASSWORD 'password';
CREATE DATABASE rainwave WITH OWNER rainwave;
```

Now connect to the database you created, and execute:

```
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

## Postgres Setup for existing phpBB

Connect to the phpBB database as your database superuser
and execute the following SQL:

```
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

When configuring Rainwave, use the exact same address, user, and password for Rainwave
as you do for phpBB.

## Configure Rainwave

Edit your configuration file in the Rainwave `etc/`, and follow the instructions
within to setup your install. Please read through the entire config carefully.
Some options are very important.

Tips:

-   Until you're ready to deploy a production version, it's best to leave development mode
    on and keep Rainwave single-processed.
-   Do not create a station with ID 0.
-   If using phpBB, configure the database _exactly_ the same as you did for phpBB

Potential gotcha:

If you start seeing "Peer authentication failed" messages when running Rainwave,
you _may_ have to edit your pg_hba.conf after this if you get errors trying to
connect. The pg_hba.conf is usually located at `/etc/postgresql/[VERSION]/main/pg_hba.conf`.
If you're running this all on the same machine, add this line to the file:

```
local    [DATABASE NAME]     [DATABASE USER]         md5
```

## Adding Music to your Rainwave Library

Locate the "song_dir" entry from your configuration file and copy/paste
your music library to this directory.

Note: If using a remote Linux server you will need to use SFTP/SSH, or install
vsftpd or similar FTP server package, to upload music to the directory.

-   _Your MP3 tags must be accurate_. Rainwave reads the tags to obtain
    track information, which is necessary to manage song rotation.
-   Upload a minimum of 1,000 songs. Rainwave requires a minimal library
    of this size to operate correctly.
-   Place albums in seperate directories if using album art. To add album art,
    create a file named "folder.jpg" and place it in each album directory
    for it to appear. (sorry, embedded album art is not supported)
-   Rainwave and LiquidSoap support unicode MP3 tags, but do not support
    unicode filenames. Please rename files that contain accents and symbols.
    Rainwave will reject and skip files that contain accents or symbols.

## First Start and Test

Open a terminal/command line to your Rainwave repository directory.
You need to initialize the database and then add your songs to the database:

```
python db_init.py
```

Now have Rainwave pick up the music you added to your `song_dirs`:

```
python rw_scanner.py --full
```

This will run a full scan of your `song_dirs`. To monitor `song_dirs`
continuously without using CPU, run `rw_scanner.py` without the `--full` switch.

Once done, open another terminal/command line and start the music
management backend that LiquidSoap talks to:

```
python rw_backend.py
```

Once that is started successfully, open another terminal/command line
and start the public-facing website and API:

```
python rw_api.py
```

Now use the same tool LiquidSoap uses to test that everything works:

```
python rw_get_next.py
```

If successful, you should see a song file name as output.

Open the beta URL at `/beta/?sid=1` to see your Rainwave.

If you are not running against an installed phpBB and want
to emulate being logged in, open `/api4/test/login_tuned_in/1`.

## Deploying to Production (Linux Only)

### Installing a Production Rainwave

Before running `install.py`:

With an existing phpBB install already ready, copy your Rainwave
configuration file to `/etc/rainwave.conf` and tune for production.
e.g. Turn off development modes, turn down logging, increase
number of processes to the number of CPUs you
have.

Rudimentary init scripts are included for sysvinit but are not
installed for you by default. You can install
our initscripts with `sudo cp initscript /etc/init.d/rainwave`.

If use systemd and create scripts for systemd,
please contribute back to us!
([GitHub Issue](https://github.com/rmcauley/rainwave/issues/99))

`install.py` will attempt to automatically run
`/etc/init.d/rainwave` with `start` and `stop` arguments if
the script exists.

`sudo python install.py` when ready, and Rainwave will be copied to
`/opt/rainwave`, and will minify and bundle Javascript to be put
into the "baked" static directory.

Rainwave depends on three daemons:

-   `rw_backend.py` to act for LiquidSoap
-   `rw_api.py` to act for browsers
-   `rw_scanner.py` which monitors the filesystem for new/changed songs

### Updating a Running Rainwave

When updating Rainwave, to bust caches and make sure your users
are getting the latest code, you **have** to edit `etc/buildnum` and
increase the build number _before_ using `install.py`. If you don't do this,
your users will continually run old code.

During installation, Rainwave has no safety mechanisms or rolling restarts.
Rainwave will appear to be shutdown for a few seconds to the outside
world while installing/updating. If the restart fails, Rainwave will be
offline. ([GitHub Issue](https://github.com/rmcauley/rainwave/issues/95))

### Icecast and Listener Tune In/Out Recognition

For user tune in recognition to work, you have to use Icecast's
user authentication system. Sample Icecast configurations are
included in Rainwave's `etc/` directory.

### LiquidSoap Configuration

A sample LiquidSoap configuration is included in `etc/`.

## Developing The Front-End

By this point in the documentation, you've already got a working
Rainwave! Open it up and start poking around with developer tools!

To edit the site:

-   Use Visual Studio Code and the provided `rainwave.code-workspace`
-   Install the Python and Prettier extensions for VSCode.

File locations:

-   HTML files for the index and admin panels can be found in `templates/`.
-   HTML templates for the main site can be found in `static/templates5/`.
-   CSS files are in `static/style5` and the entry point is `r5.scss`.
-   Image files are in `static/images4`.
-   JS files are in `static/js5`:
    -   Execution starts from `main.js`.
    -   No libraries or frameworks are used

Rainwave rebuilds CSS on each page load of `/beta` when
development mode is on, and `/beta` serves the Javascript without
minification or bundling. No need for npm, package managers,
or watchers.

## Contact

You can get help for deployment and development through the main
developer, Rob, on the Rainwave forums and/or chat channel:

-   http://rainwave.cc/forums/
-   https://discord.gg/7fuzz4u
