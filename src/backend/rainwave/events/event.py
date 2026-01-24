from typing import TypeVar, Type, Any
from time import time as timestamp
from rainwave.playlist_objects.song import Song

from libs import db
from libs import log

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
    def load_producer_by_id(cls: Type[T], sched_id) -> T | None:
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
        p.dj_user_id = row["sched_dj_user_id"]
        p.load()
        return p

    @classmethod
    def create(
        cls,
        sid,
        start,
        end,
        name="",
        public=True,
        timed=True,
        url=None,
        use_crossfade=True,
        use_tag_suffix=True,
        dj_user_id=None,
    ):
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
        evt.dj_user_id = dj_user_id
        db.c.update(
            "INSERT INTO r4_schedule "
            "(sched_id, sched_start, sched_end, sched_type, sched_name, sid, sched_public, sched_timed, sched_url, sched_use_crossfade, sched_use_tag_suffix, sched_dj_user_id) VALUES "
            "(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                evt.id,
                evt.start,
                evt.end,
                evt.type,
                evt.name,
                evt.sid,
                evt.public,
                evt.timed,
                evt.url,
                evt.use_crossfade,
                evt.use_tag_suffix,
                evt.dj_user_id,
            ),
        )
        return evt

    def __init__(self, sid):
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
        self.dj_user_id = None

    def duplicate(self):
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
            self.dj_user_id,
        )
        ts = int(timestamp())
        if duped.start < ts:
            duped.change_start(ts + 86400)
            duped.change_end(duped.start + (self.end - self.start))
        return duped

    def change_start(self, new_start):
        if not self.used:
            self.start = new_start
            db.c.update(
                "UPDATE r4_schedule SET sched_start = %s WHERE sched_id = %s",
                (self.start, self.id),
            )
        else:
            raise Exception("Cannot change the start time of a used producer.")

    def change_end(self, new_end):
        if not self.used:
            self.end = new_end
            db.c.update(
                "UPDATE r4_schedule SET sched_end = %s WHERE sched_id = %s",
                (self.end, self.id),
            )
        else:
            raise Exception("Cannot change the start time of a used producer.")

    def has_next_event(self):
        raise Exception("No event type specified.")

    def load_next_event(self, target_length=None, min_elec_id=None):
        raise Exception("No event type specified.")

    def load_event_in_progress(self):
        raise Exception("No event type specified.")

    def start_producer(self):
        if not self.start_actual:
            self.start_actual = int(timestamp())
            if self.id:
                db.c.update(
                    "UPDATE r4_schedule SET sched_in_progress = TRUE, sched_start_actual = %s where sched_id = %s",
                    (self.start_actual, self.id),
                )

    def finish(self):
        self.end_actual = int(timestamp())
        if self.id:
            db.c.update(
                "UPDATE r4_schedule SET sched_used = TRUE, sched_in_progress = FALSE, sched_end_actual = %s WHERE sched_id = %s",
                (self.end_actual, self.id),
            )

    def load(self):
        pass

    def to_dict(self):
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


class BaseEvent:
    name: str | None

    def __init__(self, sid=None):
        self.id = 0
        self.type = self.__class__.__name__
        self.start = None
        self.start_actual = None
        self.use_crossfade = True
        self.use_tag_suffix = True
        self.end = None
        self.end_actual = None
        self.used = False
        self.url = None
        self.in_progress = False
        self.is_election = False
        self.replay_gain = None
        self.name = None
        self.sid = sid
        self.songs = []
        self.core_event_id = None

    def _update_from_dict(self, dct):
        pass

    def get_filename(self):
        if hasattr(self, "songs"):
            return self.songs[0].filename
        return None

    def get_song(self) -> Song | None:
        if hasattr(self, "songs"):
            return self.songs[0]
        return None

    def prepare_event(self):
        if self.in_progress and not self.used:
            return
        elif self.used:
            raise EventAlreadyUsed
        song = self.get_song()
        self.replay_gain = song.replay_gain if song else None

    def start_event(self):
        self.start_actual = int(timestamp())
        self.in_progress = True

    def finish(self):
        self.used = True
        self.in_progress = False
        self.end = int(timestamp())

        song = self.get_song()
        if song:
            song.update_last_played(self.sid)
            song.start_cooldown(self.sid)
            song.update_rating()

    def length(self):
        # These go in descending order of accuracy
        if not self.used and hasattr(self, "songs"):
            return self.songs[0].data["length"]
        elif self.start_actual and self.end:
            return self.start_actual - self.end
        elif self.start and self.end:
            return self.start - self.end
        elif hasattr(self, "songs"):
            return self.songs[0].data["length"]
        else:
            log.warn(
                "event",
                "Event ID %s (type %s) failed on length calculation.  Used: %s / Songs: %s / Start Actual: %s / Start: %s / End: %s"
                % (
                    self.id,
                    self.type,
                    self.used,
                    len(self.songs),
                    self.start_actual,
                    self.start,
                    self.end,
                ),
            )
            return 0

    def to_dict(self, user=None, check_rating_acl=False):
        obj = {
            "id": self.id,
            "start": self.start,
            "start_actual": self.start_actual,
            "end": self.end_actual or self.end,
            "type": self.type,
            "name": self.name,
            "sid": self.sid,
            "url": self.url,
            "voting_allowed": False,
            "used": self.used,
            "length": self.length(),
            "core_event_id": self.core_event_id,
        }
        if hasattr(self, "songs"):
            if self.start_actual:
                obj["end"] = self.start_actual + self.length()
            elif self.start:
                obj["end"] = self.start + self.length()
            obj["songs"] = []
            for song in self.songs:
                if check_rating_acl:
                    song.check_rating_acl(user)
                obj["songs"].append(song.to_dict(user))
        return obj

    def delete(self):
        pass
