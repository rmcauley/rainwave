from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.playlist.song.model.song_on_station import SongOnStation
from common.schedule.timeline import TimelineOnStation


async def start_next_timeline_entry_and_get_song_to_play(
    cursor: RainwaveCursor | RainwaveCursorTx, timeline: TimelineOnStation
) -> SongOnStation:
    upnext = timeline.upnext[0]
    await upnext.start(cursor)
    return upnext.get_song_on_station_to_play()
