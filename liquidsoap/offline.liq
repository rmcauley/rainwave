%include "_relay_creds.liq.util"

r4_dest_desc = "Rainwave Is Offline"
r4_dest_url = "http://rainwave.cc"

r4_offline = drop_metadata(merge_tracks(single("/home/icecast/~misc/offline.mp3")))

opus_encode = %opus(bitrate=112, signal="music")
mp3_encode = %mp3.vbr(quality=7)
relay_genre = "Video Game Music"

output.icecast(opus_encode, host=relay_host, port=8000, password=relay_pass, mount="offline-game.ogg", genre=relay_genre, url=r4_dest_url, description=r4_dest_desc, r4_offline)
output.icecast(opus_encode, host=relay_host, port=8000, password=relay_pass, mount="offline-ocremix.ogg", genre=relay_genre, url=r4_dest_url, description=r4_dest_desc, r4_offline)
output.icecast(opus_encode, host=relay_host, port=8000, password=relay_pass, mount="offline-covers.ogg", genre=relay_genre, url=r4_dest_url, description=r4_dest_desc, r4_offline)
output.icecast(opus_encode, host=relay_host, port=8000, password=relay_pass, mount="offline-chiptune.ogg", genre=relay_genre, url=r4_dest_url, description=r4_dest_desc, r4_offline)
output.icecast(opus_encode, host=relay_host, port=8000, password=relay_pass, mount="offline-all.ogg", genre=relay_genre, url=r4_dest_url, description=r4_dest_desc, r4_offline)
output.icecast(mp3_encode, host=relay_host, port=8000, password=relay_pass, mount="offline-game.mp3", genre=relay_genre, url=r4_dest_url, description=r4_dest_desc, r4_offline)
output.icecast(mp3_encode, host=relay_host, port=8000, password=relay_pass, mount="offline-ocremix.mp3", genre=relay_genre, url=r4_dest_url, description=r4_dest_desc, r4_offline)
output.icecast(mp3_encode, host=relay_host, port=8000, password=relay_pass, mount="offline-covers.mp3", genre=relay_genre, url=r4_dest_url, description=r4_dest_desc, r4_offline)
output.icecast(mp3_encode, host=relay_host, port=8000, password=relay_pass, mount="offline-chiptune.mp3", genre=relay_genre, url=r4_dest_url, description=r4_dest_desc, r4_offline)
output.icecast(mp3_encode, host=relay_host, port=8000, password=relay_pass, mount="offline-all.mp3", genre=relay_genre, url=r4_dest_url, description=r4_dest_desc, r4_offline)
