from typing import Any
from time import time as timestamp

from common.playlist.song.song import Song

from libs import log


class BaseEvent:
    name: str | None

    def __init__(self, sid: int | None = None) -> None:
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

    def _update_from_dict(self, dct: dict[str, Any]) -> None:
        pass

    def get_filename(self) -> str | None:
        if hasattr(self, "songs"):
            return self.songs[0].filename
        return None

    def get_song(self) -> Song | None:
        if hasattr(self, "songs"):
            return self.songs[0]
        return None

    def prepare_event(self) -> None:
        if self.in_progress and not self.used:
            return
        elif self.used:
            raise EventAlreadyUsed
        song = self.get_song()
        self.replay_gain = song.replay_gain if song else None

    def start_event(self) -> None:
        self.start_actual = int(timestamp())
        self.in_progress = True

    def finish(self) -> None:
        self.used = True
        self.in_progress = False
        self.end = int(timestamp())

        song = self.get_song()
        if song:
            song.update_last_played(self.sid)
            # this moved to here
            album.update_last_played(self.sid)
            song.start_cooldown(self.sid)
            song.update_rating()
            # this moved to here
            album.update_rating()

    def length(self) -> int:
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

    def to_dict(
        self, user: Any | None = None, check_rating_acl: bool = False
    ) -> dict[str, Any]:
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

    def delete(self) -> None:
        pass
