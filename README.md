# Rainwave Radio Controller

This is the git project for the Rainwave website, https://rainwave.cc.

Rainwave is a system to control an external player such as MPD,
or a streaming source such as Ices or LiquidSoap. It cannot play
or stream audio by itself.

The software stack and data flow for broadcasting:

- LiquidSoap asks Rainwave's song change API server what song/MP3 file should be played
- Rainwave song change API server replies with a song/MP3 file
- LiquidSoap plays the song, encodes the stream, and sends the audio to Icecast
- Icecast distributes audio to users
- Icecast tells Rainwave's web API when users tune in/out
- Users interact with Rainwave through the Javascript website and the Rainwave Web API.

Rainwave only supports reading tags from MP3 files.

## Prerequisites

Authentication for Rainwave users is dependant on Discord.

- Enable external auth by placing your app keys in the config file
- If you're just running Rainwave for streaming audio, you do not need Discord.
- If you are just testing/developing locally, you do not need Discord.

If using Icecast, Icecast 2.5.0 or above is required.

If using LiquidSoap, LiquidSoap 1.1 or above is required.

### Prerequisites on Debian/Ubuntu

Rainwave is designed to run on Python 3.14 using `uv`.

```
git clone https://github.com/rmcauley/rainwave.git
cd rainwave
sudo apt install libicu-dev rsgain
uv sync
```

## Postgres Setup

```
sudo -u postgres createdb rainwave
sudo -u postgres psql -d rainwave -c "CREATE EXTENSION IF NOT EXISTS pg_trgm"
```

## Configure Rainwave

Edit your configuration file in `./etc/rainwave_config.py`, and follow the instructions
within to setup your install. Please read through the entire config carefully.
Some options are very important.

Tips:

- Until you're ready to deploy a production version, it's best to leave development mode
  on and keep Rainwave single-processed.
- Do not create a station with ID 0 - ID 0 is reserved.

## Adding Music to your Rainwave Library

Locate the "song_dir" entry from your configuration file and copy/paste
your music library to this directory.

- _Your MP3 tags must be accurate_. Rainwave reads the tags to obtain
  track information, which is necessary to manage song rotation.
- Upload a minimum of 1,000 songs. Rainwave requires a minimal library
  of this size to operate correctly.
- Place albums in separate directories if using album art. To add album art,
  create a file named "folder.jpg" and place it in each album directory
  for it to appear. (sorry, embedded album art is not supported)
- Rainwave and LiquidSoap support unicode MP3 tags, but do not support
  unicode filenames. Please rename files that contain accents and symbols.
  Rainwave will reject and skip files that contain accents or symbols.

## First Start and Test

Open a terminal/command line to your Rainwave repository directory.
You need to initialize the database and then add your songs to the database:

```
uv run db_init.py
```

Now have Rainwave pick up the music you added to your `song_dirs`:

```
uv run rw_scanner.py --full
```

This will run a full scan of your `song_dirs`. To monitor `song_dirs`
continuously without using CPU, run `rw_scanner.py` without the `--full` switch.

Once done, open another terminal/command line and start the music
management backend that LiquidSoap talks to:

```
uv run rw_song_change_api.py
```

Once that is started successfully, open another terminal/command line
and start the public-facing website and API:

```
uv run rw_web_api.py
```

Now use the same tool LiquidSoap uses to test that everything works:

```
uv run rw_get_next.py
```

If successful, you should see a song file name as output.

Open the beta URL at `/?sid=1` to see your Rainwave.

If you are not running against an installed phpBB and want
to emulate being logged in, open `/api4/test/login_tuned_in/1`.

## Deploying to Production

### Installing a Production Rainwave

[[TODO]]

Rainwave's currently undergoing changes to its deployment and startup
scripts so that it runs as a Rainwave user and everything is contained
to its own home directory.

### Updating a Running Rainwave

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

## Contact

You can get help for deployment and development through the main
developer, Rob, on the Rainwave discord:

- https://discord.gg/fdb2cs7puS
