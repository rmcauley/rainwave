from attr import dataclass

from common.playlist.song.model.song_on_station import SongOnStation
from common.schedule.schedule_models.timeline_entry_base import TimelineEntryBase


@dataclass
class TimelineOnStation:
    history: list[SongOnStation]
    current: TimelineEntryBase
    upnext: list[TimelineEntryBase]
