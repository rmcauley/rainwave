from backend.db.cursor import RainwaveCursor, RainwaveCursorTx
from backend import config

num_songs_total = 0
num_songs: dict[int, int] = {}
num_origin_songs: dict[int, int] = {}
num_albums: dict[int, int] = {}
max_album_ids: dict[int, int] = {}


async def update_playlist_object_counts(
    cursor: RainwaveCursor | RainwaveCursorTx,
) -> None:
    global num_songs_total
    global num_songs
    global num_origin_songs
    global num_albums
    global max_album_ids

    num_songs_total = await cursor.fetch_guaranteed(
        "SELECT COUNT(song_id) FROM r4_songs WHERE song_verified = TRUE",
        params=None,
        default=0,
        var_type=int,
    )
    for sid in config.station_ids:
        num_songs[sid] = await cursor.fetch_guaranteed(
            "SELECT COUNT(song_id) FROM r4_song_sid WHERE song_exists = TRUE AND sid = %s",
            (sid,),
            default=0,
            var_type=int,
        )
        num_origin_songs[sid] = await cursor.fetch_guaranteed(
            "SELECT COUNT(song_id) FROM r4_songs WHERE song_verified = TRUE AND song_origin_sid = %s",
            (sid,),
            default=0,
            var_type=int,
        )
        num_albums[sid] = await cursor.fetch_guaranteed(
            "SELECT COUNT(album_id) FROM r4_album_sid WHERE sid = %s AND album_exists = TRUE",
            (sid,),
            default=0,
            var_type=int,
        )
        max_album_ids[sid] = await cursor.fetch_guaranteed(
            "SELECT MAX(album_id) FROM r4_album_sid WHERE sid = %s AND album_exists = TRUE",
            (sid,),
            default=0,
            var_type=int,
        )
