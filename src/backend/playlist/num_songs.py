from src.backend.libs import db
from src.backend import config

num_songs_total = 0
num_songs: dict[int, int] = {}
num_origin_songs: dict[int, int] = {}
num_albums: dict[int, int] = {}
max_album_ids: dict[int, int] = {}


def update_num_songs() -> None:
    global num_songs_total
    global num_songs
    global num_origin_songs
    global num_albums
    global max_album_ids

    num_songs_total = db.c.fetch_var(
        "SELECT COUNT(song_id) FROM r4_songs WHERE song_verified = TRUE"
    )
    for sid in config.station_ids:
        num_songs[sid] = db.c.fetch_var(
            "SELECT COUNT(song_id) FROM r4_song_sid WHERE song_exists = TRUE AND sid = %s",
            (sid,),
        )
        num_origin_songs[sid] = db.c.fetch_var(
            "SELECT COUNT(song_id) FROM r4_songs WHERE song_verified = TRUE AND song_origin_sid = %s",
            (sid,),
        )
        num_albums[sid] = db.c.fetch_var(
            "SELECT COUNT(album_id) FROM r4_album_sid WHERE sid = %s AND album_exists = TRUE",
            (sid,),
        )
        max_album_ids[sid] = db.c.fetch_var(
            "SELECT MAX(album_id) FROM r4_album_sid WHERE sid = %s AND album_exists = TRUE",
            (sid,),
        )
