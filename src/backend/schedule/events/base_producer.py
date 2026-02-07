from typing import TypeVar, Type, Any
from time import time as timestamp

from backend.libs import db

all_producers = {}


def register_producer(cls: type[Any]) -> type[Any]:
    global all_producers
    all_producers[cls.__name__] = cls
    return cls


def get_admin_creatable_producers() -> list[str]:
    types = []
    for key in all_producers.keys():
        if key not in ("ShortestElectionProducer", "OneUpProducer"):
            types.append(key)
    return types


class InvalidScheduleID(Exception):
    pass


class InvalidScheduleType(Exception):
    pass


class EventAlreadyUsed(Exception):
    pass


T = TypeVar("T", bound="BaseProducer")


class BaseProducer:
    name: str

    @classmethod
    def load_producer_by_id(cls: Type[T], sched_id: int) -> T | None:
        global all_producers
        row = db.c.fetch_row(
            "SELECT * FROM r4_schedule WHERE sched_id = %s", (sched_id,)
        )
        if not row or len(row) == 0:
            return None
        p = None
        if row["sched_type"] in all_producers:
            p = all_producers[row["sched_type"]](row["sid"])
        else:
            raise Exception("Unknown producer type %s." % row["sched_type"])
        p.id = row["sched_id"]
        p.start = row["sched_start"]
        p.start_actual = row["sched_start_actual"]
        p.end = row["sched_end"]
        p.end_actual = row["sched_end_actual"]
        p.name = row["sched_name"]
        p.public = row["sched_public"]
        p.timed = row["sched_timed"]
        p.in_progress = row["sched_in_progress"]
        p.used = row["sched_used"]
        p.use_crossfade = row["sched_use_crossfade"]
        p.use_tag_suffix = row["sched_use_tag_suffix"]
        p.url = row["sched_url"]
        p.load()
        return p

    @classmethod
    def create(
        cls,
        sid: int,
        start: int,
        end: int,
        name: str = "",
        public: bool = True,
        timed: bool = True,
        url: str | None = None,
        use_crossfade: bool = True,
        use_tag_suffix: bool = True,
    ) -> "BaseProducer":
        evt = cls(sid)
        evt.id = db.c.get_next_id("r4_schedule", "sched_id")
        evt.start = start
        evt.end = end
        evt.name = name
        evt.sid = sid
        evt.public = public
        evt.timed = timed
        evt.url = url
        evt.use_crossfade = use_crossfade
        evt.use_tag_suffix = use_tag_suffix
        db.c.update(
            """
                INSERT INTO r4_schedule (
                    sched_id,
                    sched_start,
                    sched_end,
                    sched_type,
                    sched_name,
                    sid,
                    sched_public,
                    sched_timed,
                    sched_url,
                    sched_use_crossfade,
                    sched_use_tag_suffix
                )
                VALUES (
                    %(sched_id)s,
                    %(sched_start)s,
                    %(sched_end)s,
                    %(sched_type)s,
                    %(sched_name)s,
                    %(sid)s,
                    %(sched_public)s,
                    %(sched_timed)s,
                    %(sched_url)s,
                    %(sched_use_crossfade)s,
                    %(sched_use_tag_suffix)s
                )
""",
            {
                "sched_id": evt.id,
                "sched_start": evt.start,
                "sched_end": evt.end,
                "sched_type": evt.type,
                "sched_name": evt.name,
                "sid": evt.sid,
                "sched_public": evt.public,
                "sched_timed": evt.timed,
                "sched_url": evt.url,
                "sched_use_crossfade": evt.use_crossfade,
                "sched_use_tag_suffix": evt.use_tag_suffix,
            },
        )
        return evt

    def __init__(self, sid: int) -> None:
        self.sid = sid
        self.id = None
        self.start = 0
        self.start_actual = None
        self.end = 0
        self.end_actual = None
        self.type = self.__class__.__name__
        self.name = ""
        self.public = True
        self.timed = True
        self.url = None
        self.in_progress = False
        self.used = False
        self.use_crossfade = True
        self.use_tag_suffix = True
        self.plan_ahead_limit = 1
        self.songs = []

    def duplicate(self) -> "BaseProducer":
        duped = self.__class__.create(
            self.sid,
            self.start,
            self.end,
            self.name,
            self.public,
            self.timed,
            self.url,
            self.use_crossfade,
            self.use_tag_suffix,
        )
        ts = int(timestamp())
        if duped.start < ts:
            duped.change_start(ts + 86400)
            duped.change_end(duped.start + (self.end - self.start))
        return duped

    def change_start(self, new_start: int) -> None:
        if not self.used:
            self.start = new_start
            db.c.update(
                "UPDATE r4_schedule SET sched_start = %s WHERE sched_id = %s",
                (self.start, self.id),
            )
        else:
            raise Exception("Cannot change the start time of a used producer.")

    def change_end(self, new_end: int) -> None:
        if not self.used:
            self.end = new_end
            db.c.update(
                "UPDATE r4_schedule SET sched_end = %s WHERE sched_id = %s",
                (self.end, self.id),
            )
        else:
            raise Exception("Cannot change the start time of a used producer.")

    def has_next_event(self) -> Any:
        raise Exception("No event type specified.")

    def load_next_event(
        self, target_length: int | None = None, min_elec_id: int | None = None
    ) -> Any:
        raise Exception("No event type specified.")

    def load_event_in_progress(self) -> Any:
        raise Exception("No event type specified.")

    def start_producer(self) -> None:
        if not self.start_actual:
            self.start_actual = int(timestamp())
            if self.id:
                db.c.update(
                    "UPDATE r4_schedule SET sched_in_progress = TRUE, sched_start_actual = %s where sched_id = %s",
                    (self.start_actual, self.id),
                )

    def finish(self) -> None:
        self.end_actual = int(timestamp())
        if self.id:
            db.c.update(
                "UPDATE r4_schedule SET sched_used = TRUE, sched_in_progress = FALSE, sched_end_actual = %s WHERE sched_id = %s",
                (self.end_actual, self.id),
            )

    def load(self) -> None:
        pass

    def to_dict(self) -> dict[str, Any]:
        obj = {
            "sid": self.sid,
            "id": self.id,
            "start": self.start,
            "start_actual": self.start_actual,
            "end": self.end,
            "end_actual": self.end_actual,
            "type": self.type,
            "name": self.name,
            "public": self.public,
            "timed": self.timed,
            "url": self.url,
            "in_progress": self.in_progress,
            "used": self.used,
            "use_crossfade": self.use_crossfade,
            "use_tag_suffix": self.use_tag_suffix,
            "plan_ahead_limit": self.plan_ahead_limit,
        }
        if hasattr(self, "songs"):
            obj["songs"] = []
            if self.songs:
                for song in self.songs:
                    obj["songs"].append(song.to_dict())
        return obj
