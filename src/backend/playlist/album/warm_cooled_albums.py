def warm_cooled_albums(sid: int) -> None:
    if sid == 0:
        return
    global updated_album_ids
    album_list = db.c.fetch_list(
        "SELECT album_id FROM r4_album_sid WHERE sid = %s AND album_cool_lowest <= %s AND album_cool = TRUE",
        (sid, timestamp()),
    )
    for album_id in album_list:
        updated_album_ids[sid][album_id] = True
    db.c.update(
        "UPDATE r4_album_sid SET album_cool = FALSE WHERE sid = %s AND album_cool_lowest <= %s AND album_cool = TRUE",
        (sid, timestamp()),
    )
