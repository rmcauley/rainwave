#!/usr/bin/liquidsoap

# This is a sample LiquidSoap file.
# You can use this example to add Rainwave as a source for your existing
# LiquidSoap configuration.

def rw_backend() =
		# CHANGEME: Change the "1" here to be your Rainwave station ID
		# CHANGEME: /path/to/rainwave needs to point to your install
		# CHANGEME: /etc/rainwave.conf should point to your Rainwave config
		result = get_process_output("/path/to/rainwave/rw_get_next.py --config /etc/rainwave.conf --sid 1")
		request.create(result)
end

# CHANGEME: Change to a song that should play if Rainwave has crashed/is offline.
# note that this file cannot be filled with silence, LiquidSoap will not allow it
# use a song of some sort
offline = single("/path/to/a/song.mp3")

source = request.dynamic(rw_backend, length=6.0, conservative=false)
source = amplify(0.7, override="replay_gain", audio_to_stereo(source))
# CHANGEME: mydomain.com
source = rewrite_metadata([("title", '$(if $(use_suffix),"$(title) $(suffix)","$(title)")'), ("url", "mydomain.com")], source)
source = fallback([source, offline], track_sensitive=false)

# CHANGEME: The host, port, and password should be your Icecast host, port, and Icecast source password
# CHANGEME: Make sure your station.mp3 matches your
output.icecast( %mp3.vbr(quality=8), host="localhost", port=8000, password="hackme", mount="station.mp3", genre="Music", source)
