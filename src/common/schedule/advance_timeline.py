from datetime import datetime
from common.cache.update_user_rating_acl import update_user_rating_acl
from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.listeners.trim_listeners import trim_listeners
from common.listeners.unlock_listeners import unlock_listeners
from common.playlist.album.get_album_on_station import get_many_album_on_station
from common.playlist.album.warm_cooled_albums import warm_cooled_albums
from common.playlist.reduce_song_blocks_by_one import reduce_song_blocks_by_one
from common.playlist.song.start_song_cooldown import (
    start_song_cooldown_and_update_rating,
)
from common.playlist.warm_cooled_songs import warm_cooled_songs
from common.schedule.generate_next_timeline_entries import (
    generate_next_timeline_entries,
)
from common.schedule.timeline import TimelineOnStation
from common.schedule.trim_schedule import trim_schedule
from backend.update_memcache_for_station import update_memcache_for_station
from common.schedule.update_tunein import update_tunein


async def advance_timeline(
    cursor: RainwaveCursor | RainwaveCursorTx, sid: int, timeline: TimelineOnStation
) -> None:
    processing_start_time = datetime.now()

    just_ended_song = timeline.current.get_song_on_station_to_play()
    await timeline.current.finish(cursor)

    timeline.history = timeline.history[:4]
    timeline.history.insert(0, just_ended_song)
    timeline.current = timeline.upnext.pop(0)

    await cursor.update(
        "INSERT INTO r4_song_history (sid, song_id) VALUES (%s, %s)",
        (sid, just_ended_song.id),
    )
    await cursor.update(
        "UPDATE r4_listeners SET listener_voted_entry = NULL WHERE sid = %s", (sid,)
    )
    await start_song_cooldown_and_update_rating(cursor, just_ended_song)
    await trim_schedule(cursor, sid)
    await trim_listeners(cursor, sid)
    await update_user_rating_acl(cursor, sid, just_ended_song.id)
    await unlock_listeners(cursor, sid)
    await warm_cooled_songs(cursor, sid)
    await warm_cooled_albums(cursor, sid)
    await reduce_song_blocks_by_one(cursor, sid)

    await generate_next_timeline_entries(cursor, sid, timeline)

    modified_album_ids = await cursor.fetch_list(
        "SELECT album_id FROM r4_album_sid WHERE album_updated_at > %s AND sid = %s",
        (processing_start_time, sid),
        row_type=int,
    )
    modified_albums = await get_many_album_on_station(cursor, modified_album_ids, sid)

    await update_memcache_for_station(sid, timeline, modified_albums)

    update_tunein(sid, timeline)
