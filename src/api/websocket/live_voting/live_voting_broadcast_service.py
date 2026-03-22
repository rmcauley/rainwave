import datetime
from typing import Any

import tornado

from api.websocket.websocket_tracker.websocket_tracker import websockets_by_sid
from common.cache.station_cache import cache_get_station
from common.zeromq import zeromq


class LiveVotingBroadcastService:
    """Coordinate live-voting websocket broadcasts with per-station coalescing."""

    def __init__(self, cooldown_seconds: int = 2) -> None:
        super().__init__()
        self.cooldown_seconds = cooldown_seconds
        self._cooldown_timer_by_sid: dict[int, object | None] = {
            sid: None for sid in websockets_by_sid
        }
        self._pending_update_by_sid: dict[int, bool] = {
            sid: False for sid in websockets_by_sid
        }

    def publish_live_voting_updated(self, sid: int, uuid_exclusion: str | None) -> None:
        zeromq.publish(
            {
                "action": "live_voting_updated",
                "sid": sid,
                "uuid_exclusion": uuid_exclusion,
            }
        )

    async def handle_live_voting_updated_message(self, message: dict[str, Any]) -> None:
        """Broadcast immediately on the leading edge, then coalesce updates."""
        sid = message["sid"]
        if self._cooldown_timer_by_sid.get(sid):
            self._pending_update_by_sid[sid] = True
            return

        await self._broadcast_live_voting_from_cache(sid, message.get("uuid_exclusion"))
        self._start_cooldown(sid)

    def clear_pending_live_vote(self, sid: int) -> None:
        """Cancel the cooldown window and drop any queued trailing update."""
        timer = self._cooldown_timer_by_sid.get(sid)
        if timer:
            tornado.ioloop.IOLoop.instance().remove_timeout(timer)
        self._cooldown_timer_by_sid[sid] = None
        self._pending_update_by_sid[sid] = False

    def _start_cooldown(self, sid: int) -> None:
        self._cooldown_timer_by_sid[sid] = tornado.ioloop.IOLoop.instance().add_timeout(
            datetime.timedelta(seconds=self.cooldown_seconds),
            lambda: tornado.ioloop.IOLoop.instance().spawn_callback(
                self.flush_pending_live_vote, sid
            ),
        )

    async def flush_pending_live_vote(self, sid: int) -> None:
        """Emit one trailing cached update if votes arrived during cooldown."""
        self._cooldown_timer_by_sid[sid] = None
        if not self._pending_update_by_sid.get(sid):
            return

        self._pending_update_by_sid[sid] = False
        await self._broadcast_live_voting_from_cache(sid, None)

    async def _broadcast_live_voting_from_cache(
        self, sid: int, uuid_exclusion: str | None
    ) -> None:
        live_voting = await cache_get_station(sid, "live_voting")
        websockets_by_sid[sid].send_to_all(
            uuid_exclusion, {"live_voting": live_voting or {}}
        )
