from backend import config


updated_album_ids: dict[int, dict[int, bool]] = {sid: {} for sid in config.station_ids}


def clear_updated_albums(sid: int) -> None:
    global updated_album_ids
    updated_album_ids[sid] = {}


def get_updated_albums_dict(sid: int) -> list[dict[str, Any]]:
    global updated_album_ids
    if not sid in updated_album_ids:
        return []

    previous_newest_album = cache.get_station(sid, "newest_album")
    if not previous_newest_album:
        cache.set_station(sid, "newest_album", timestamp())
    else:
        newest_albums = db.c.fetch_list(
            "SELECT album_id FROM r4_albums JOIN r4_album_sid USING (album_id) WHERE sid = %s AND album_added_on > %s",
            (sid, previous_newest_album),
        )
        for album_id in newest_albums:
            updated_album_ids[sid][album_id] = True
        cache.set_station(sid, "newest_album", timestamp())

    album_diff = []
    for album_id in updated_album_ids[sid]:
        album = Album.load_from_id_sid(album_id, sid)
        album.solve_cool_lowest(sid)
        album_diff.append(album.to_album_diff())

    return album_diff
