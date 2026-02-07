from abc import ABC, abstractmethod
from typing import Any

from backend.db.cursor import RainwaveCursor
from backend.user.model.user_data_type import (
    UserPrivateData,
    UserPublicData,
    UserServerData,
)
from backend.user.user_model import ListenerRecord


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
    async def get_request_count_for_station(
        self, cursor: RainwaveCursor, sid: int
    ) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def get_request_count_for_any_station(self, cursor: RainwaveCursor) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def get_remaining_request_slots(self, cursor: RainwaveCursor) -> int:
        raise NotImplementedError

    @abstractmethod
    def generate_api_key(
        self, expiry: int | None = None, reuse: str | None = None
    ) -> str:
        raise NotImplementedError

    @abstractmethod
    async def get_listener_record(
        self, cursor: RainwaveCursor
    ) -> ListenerRecord | None:
        raise NotImplementedError

    @abstractmethod
    def get_all_api_keys(self) -> list[str]:
        raise NotImplementedError

    @abstractmethod
    def _check_too_many_requests(self) -> int:
        raise NotImplementedError

    @abstractmethod
    def add_request(self, sid: int, song_id: int) -> int:
        raise NotImplementedError

    @abstractmethod
    def add_unrated_requests(self, sid: int, limit: int | None = None) -> int:
        raise NotImplementedError

    @abstractmethod
    def add_favorited_requests(self, sid: int, limit: int | None = None) -> int:
        raise NotImplementedError

    @abstractmethod
    def remove_request(self, song_id: int) -> int:
        raise NotImplementedError

    @abstractmethod
    def clear_all_requests(self) -> int:
        raise NotImplementedError

    @abstractmethod
    def clear_all_requests_on_cooldown(self) -> int:
        raise NotImplementedError

    @abstractmethod
    def pause_requests(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def unpause_requests(self, sid: int) -> bool:
        raise NotImplementedError

    @abstractmethod
    def put_in_request_line(self, sid: int) -> bool:
        raise NotImplementedError

    @abstractmethod
    def remove_from_request_line(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def is_in_request_line(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def get_top_request_song_id(self, sid: int) -> int | None:
        raise NotImplementedError

    @abstractmethod
    def get_top_request_song_id_any(self, sid: int) -> int | None:
        raise NotImplementedError

    @abstractmethod
    def get_request_line_sid(self) -> int | None:
        raise NotImplementedError

    @abstractmethod
    async def get_request_line_position(self, sid: int) -> int | None:
        raise NotImplementedError

    @abstractmethod
    async def get_request_expiry(self) -> int | None:
        raise NotImplementedError

    @abstractmethod
    def get_requests(self, sid: int) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def set_request_tunein_expiry(self, t: int | None = None) -> int | None:
        raise NotImplementedError
