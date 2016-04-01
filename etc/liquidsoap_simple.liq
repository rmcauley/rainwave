#!/usr/bin/liquidsoap

# This is a sample LiquidSoap file.
# You can use this example to add Rainwave as a source for your existing
# LiquidSoap configuration.

def rw_backend() =
        result = get_process_output("/path/to/rainwave/rw_get_next.py --sid "^rw_sid)
        request.create(result)
end

source = request.dynamic(rw_backend, length=6.0, conservative=false)
source = amplify(0.7, override="replay_gain", audio_to_stereo(source))
source = rewrite_metadata([("title", '$(if $(use_suffix),"$(title) $(suffix)","$(title)")'), ("url", rw_dest_url)], source)

output.icecast( %mp3.vbr(quality=8), host="localhost", port=8000, password="hackme", mount="rainwave.mp3", genre="Music", source)
