#!/usr/bin/liquidsoap

# This is a sample LiquidSoap configuration file.
# It's what Rainwave uses in production, with some minor modifications.

# Used if your Rainwave instance crashes.  Will loop this MP3 until you restart RW.
# No restarting of LiquidSoap necessary.
r4_offline_file = "/path/to/offline/loop.mp3"
r4_sid = "1"
r4_dest_mount = "radio"
r4_dest_desc = "My Radio"
r4_dest_url = "http://mydomain.com"
# Allows users to DJ over music. (see Liq documentation)
r4_harbor_port = 9051

set("log.level", 4)

set("harbor.timeout", 4.)

set("server.socket", true)
set("server.socket.path", "/var/run/liquidsoap/<script>.sock")
set("server.socket.permissions", 432) # translates to 660 permissions but needs to be in octal format
set("server.timeout", -1.)
r4_paused = interactive.bool("paused", false)
r4_harbor_pw = interactive.string("harbor_pw", "hackme_more")

def r4_backend() =
        result = get_process_output("/path/to/rainwave/rw_get_next.py --sid "^r4_sid)
        request.create(result)
end

def r4_live_auth(user, password) =
	if password == r4_harbor_pw() then
		true
	else
		false
	end
end

def r4_is_paused() =
	r4_paused
end

r4_auto = request.dynamic(r4_backend, length=6.0, conservative=false)
r4_auto = amplify(0.7, override="replay_gain", audio_to_stereo(r4_auto))
r4_auto = rewrite_metadata([("title", '$(if $(use_suffix),"$(title) $(suffix)","$(title)")'), ("url", r4_dest_url)], r4_auto)

r4_offline = single(r4_offline_file)
r4_auto = fallback([r4_auto, r4_offline], track_sensitive=false)

r4_live = input.harbor("/dj.mp3", id="dj_harbor", port=r4_harbor_port, auth=r4_live_auth);
r4_livemix = smooth_add(delay=0.5, p=0.2, normal=r4_auto, special=r4_live)

# output.icecast(%vorbis(quality=0.2), host="localhost", port=8000, password="hackme", mount=r4_dest_mount^".ogg", genre="Music", url=r4_dest_url, description=r4_dest_desc, r4_livemix)
output.icecast( %mp3.vbr(quality=8), host="localhost", port=8000, password="hackme", mount=r4_dest_mount^".mp3", genre="Music", url=r4_dest_url, description=r4_dest_desc, r4_livemix)
