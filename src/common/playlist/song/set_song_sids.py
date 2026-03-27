from psycopg import sql

from common import log
from common.db.build_insert import build_insert_on_conflict_do_update
from common.db.cursor import RainwaveCursor
from common.playlist.album.model.album_on_station import AlbumOnStation
from common.playlist.song.get_album_for_song import get_album_for_song
from common.playlist.song.get_groups_for_song import get_groups_for_song


async def set_song_sids(
    cursor: RainwaveCursor, song_id: int, new_sids: list[int]
) -> None:
    existing_album = await get_album_for_song(cursor, song_id)
    existing_groups = await get_groups_for_song(cursor, song_id)

    current_sids = await cursor.fetch_list(
        "SELECT sid FROM r4_song_sid WHERE song_id = %s",
        (song_id,),
        row_type=int,
    )
    log.debug(
        "playlist",
        "database sids: {}, new sids: {}".format(current_sids, new_sids),
    )

    for sid in current_sids:
        if sid not in new_sids:
            await cursor.update(
                "UPDATE r4_song_sid SET song_exists = FALSE WHERE song_id = %s AND sid = %s",
                (song_id, sid),
            )
            if existing_album:
                await AlbumOnStation.update_newest_song_time(
                    cursor, existing_album.id, sid
                )
    for sid in new_sids:
        to_insert = {"song_id": song_id, "sid": sid, "song_exists": True}
        await cursor.update(
            build_insert_on_conflict_do_update(
                "r4_song_sid", to_insert, sql.SQL("(song_id, sid)")
            ),
            to_insert,
        )
        if existing_album:
            await AlbumOnStation.update_newest_song_time(cursor, existing_album.id, sid)

    if existing_album:
        await existing_album.reconcile_sids(cursor)

    for group in existing_groups:
        await group.reconcile_sids(cursor)
