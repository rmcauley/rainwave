#!/usr/bin/liquidsoap

# This is a sample LiquidSoap configuration file.
# It's what Rainwave uses in production, with some minor modifications.

# Used if your Rainwave instance crashes.  Will loop this MP3 until you restart RW.
rw_offline_file = "/path/to/offline/loop.mp3"
# Rainwave Station ID.
rw_sid = "1"
rw_dest_mount = "radio"
rw_dest_desc = "My Radio"
rw_dest_url = "http://mydomain.com"
# Allows users to DJ over music. (see Liq documentation)
rw_harbor_port = 9051

set("log.level", 4)

set("harbor.timeout", 4.)

set("server.socket", true)
set("server.socket.path", "/var/run/liquidsoap/<script>.sock")
set("server.socket.permissions", 432) # translates to 660 permissions but needs to be in octal format
set("server.timeout", -1.)
rw_harbor_pw = interactive.string("harbor_pw", "hackme_more")

def rw_backend() =
        result = get_process_output("/path/to/rainwave/rw_get_next.py --sid "^rw_sid)
        request.create(result)
end

def rw_live_auth(user, password) =
	if password == rw_harbor_pw() then
		true
	else
		false
	end
end

rw_auto = request.dynamic(rw_backend, length=6.0, conservative=false)
rw_auto = amplify(0.7, override="replay_gain", audio_to_stereo(rw_auto))
rw_auto = rewrite_metadata([("title", '$(if $(use_suffix),"$(title) $(suffix)","$(title)")'), ("url", rw_dest_url)], rw_auto)

rw_offline = single(rw_offline_file)
rw_auto = fallback([rw_auto, rw_offline], track_sensitive=false)

rw_live = input.harbor("/dj.mp3", id="dj_harbor", port=rw_harbor_port, auth=rw_live_auth);
rw_livemix = smooth_add(delay=0.5, p=0.2, normal=rw_auto, special=rw_live)

# output.icecast(%vorbis(quality=0.2), host="localhost", port=8000, password="hackme", mount=rw_dest_mount^".ogg", genre="Music", url=rw_dest_url, description=rw_dest_desc, rw_livemix)
output.icecast( %mp3.vbr(quality=8), host="localhost", port=8000, password="hackme", mount=rw_dest_mount^".mp3", genre="Music", url=rw_dest_url, description=rw_dest_desc, rw_livemix)
