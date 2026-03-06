from attr import dataclass

from common.schedule.schedule_models.timeline_entry_base import TimelineEntryBase


@dataclass
class TimelineOnStation:
    history: list[TimelineEntryBase]
    current: TimelineEntryBase
    upnext: list[TimelineEntryBase]
