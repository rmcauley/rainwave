from abc import ABC, abstractmethod

from common.db.cursor import RainwaveCursor
from common.playlist.song.model.song_on_station import SongOnStation
from common.user.model.user_data_types import (
    UserPrivateData,
    UserPublicData,
    UserServerData,
)


class UserBase(ABC):
    # Information anyone on the site can see
    public_data: UserPublicData
    # Information only the user can see
    private_data: UserPrivateData
    # Information only the server can see
    server_data: UserServerData

    id: int

    def __init__(
        self,
        public_data: UserPublicData,
        private_data: UserPrivateData,
        server_data: UserServerData,
    ):
        super().__init__()
        self.id = public_data["id"]
        self.public_data = public_data
        self.private_data = private_data
        self.server_data = server_data

    @staticmethod
    @abstractmethod
    async def get_refreshed_data(
        cursor: RainwaveCursor, sid: int, user_id: int, api_key: str
    ) -> tuple[UserPublicData, UserPrivateData, UserServerData]:
        raise NotImplementedError

    async def get_tuned_in_sid(self) -> int | None:
        return self.server_data["listener_sid"]

    def is_tunedin(self) -> bool:
        return self.private_data["tuned_in"]

    def is_admin(self) -> bool:
        return self.private_data["admin"] > 0

    def has_perks(self) -> bool:
        return self.private_data["perks"]

    def is_anonymous(self) -> bool:
        return self.id <= 1

    async def lock_to_sid(
        self, cursor: RainwaveCursor, sid: int, lock_count: int
    ) -> int:
        self.private_data["lock"] = True
        self.private_data["lock_sid"] = sid
        self.private_data["lock_counter"] = lock_count
        return await cursor.update(
            "UPDATE r4_listeners SET listener_lock = TRUE, listener_lock_sid = %s, listener_lock_counter = %s WHERE listener_id = %s",
            (sid, lock_count, self.server_data["listener_id"]),
        )

    @abstractmethod
    async def get_remaining_request_slots(self, cursor: RainwaveCursor) -> int:
        raise NotImplementedError

    @abstractmethod
    async def add_request(
        self, cursor: RainwaveCursor, song_on_station: SongOnStation
    ) -> int:
        raise NotImplementedError

    @abstractmethod
    async def add_unrated_requests(
        self,
        cursor: RainwaveCursor,
        sid: int,
    ) -> int:
        raise NotImplementedError

    @abstractmethod
    async def add_favorited_requests(
        self,
        cursor: RainwaveCursor,
        sid: int,
    ) -> int:
        raise NotImplementedError

    @abstractmethod
    async def remove_request(self, cursor: RainwaveCursor, song_id: int) -> int:
        raise NotImplementedError

    @abstractmethod
    async def clear_all_requests(self, cursor: RainwaveCursor) -> int:
        raise NotImplementedError

    @abstractmethod
    async def clear_all_requests_on_cooldown(self, cursor: RainwaveCursor) -> int:
        raise NotImplementedError

    @abstractmethod
    async def pause_requests(self, cursor: RainwaveCursor) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def unpause_requests(self, cursor: RainwaveCursor, sid: int) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def put_in_request_line_if_necessary(
        self, cursor: RainwaveCursor, sid: int
    ) -> None:
        raise NotImplementedError
