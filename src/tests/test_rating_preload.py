import asyncio
from typing import Any, cast

import pytest

from api.helpers.rating_preload import (
    RatingPreload,
    collect_timeline_song_album_ids,
    get_rating_preload,
)
from api.websocket.websocket_tracker.websocket_tracker_for_station import (
    WebsocketTrackerForStation,
)


class FakeCursor:
    async def fetch_all(
        self,
        query: Any,
        params: Any = None,
        *,
        row_type: type[Any],
    ) -> list[Any]:
        query_text = str(query)
        if "FROM r4_song_ratings" in query_text:
            return [
                {
                    "user_id": 2,
                    "song_id": 10,
                    "song_rating_user": 4.5,
                    "song_fave": True,
                },
                {
                    "user_id": 3,
                    "song_id": 20,
                    "song_rating_user": 3.5,
                    "song_fave": False,
                },
            ]
        if "FROM r4_album_ratings" in query_text:
            return [
                {
                    "user_id": 2,
                    "album_id": 100,
                    "album_rating_user": 4.0,
                }
            ]
        if "FROM r4_album_faves" in query_text:
            return [
                {
                    "user_id": 2,
                    "album_id": 100,
                    "album_fave": True,
                },
                {
                    "user_id": 3,
                    "album_id": 200,
                    "album_fave": True,
                },
            ]
        raise AssertionError(f"Unexpected query: {query_text}")


class FakeWebsocket:
    def __init__(self, user_id: int, listen_key: str = "") -> None:
        self.user_id = user_id
        self.listen_key = listen_key
        self.uuid = f"ws-{user_id}-{listen_key}"
        self.seen_preloads: list[RatingPreload | None] = []
        self.closed = False

    async def update(self, rating_preload: RatingPreload | None = None) -> None:
        self.seen_preloads.append(rating_preload)

    def close(self) -> None:
        self.closed = True


def test_collect_timeline_song_album_ids_deduplicates() -> None:
    song = {"id": 10, "albums": [{"id": 100}]}
    other_song = {"id": 20, "albums": [{"id": 200}]}
    sched_current = {"songs": [song]}
    sched_next = [{"songs": [song, other_song]}]
    sched_history = [{"songs": [song]}]

    song_ids, album_ids = collect_timeline_song_album_ids(
        cast(Any, sched_current),
        cast(Any, sched_next),
        cast(Any, sched_history),
    )

    assert set(song_ids) == {10, 20}
    assert set(album_ids) == {100, 200}


def test_get_rating_preload_batches_and_merges_album_faves() -> None:
    preload = asyncio.run(
        get_rating_preload(
            cast(Any, FakeCursor()),
            sid=1,
            user_ids={2, 3},
            song_ids=[10, 20],
            album_ids=[100, 200],
        )
    )

    assert preload.user_ids == {2, 3}
    assert preload.song_ratings_by_user[2][10] == (4.5, True)
    assert preload.song_ratings_by_user[3][20] == (3.5, False)
    assert preload.album_ratings_by_user[2][100] == (4.0, True)
    assert preload.album_ratings_by_user[3][200] == (None, True)


def test_websocket_update_all_passes_one_preload_to_snapshot_sessions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tracker = WebsocketTrackerForStation()
    first = FakeWebsocket(2)
    second = FakeWebsocket(3)
    anonymous = FakeWebsocket(1, listen_key="anon")
    tracker.append(cast(Any, first))
    tracker.append(cast(Any, second))
    tracker.append(cast(Any, anonymous))

    preload = RatingPreload(
        user_ids={2, 3},
        song_ratings_by_user={},
        album_ratings_by_user={},
    )
    calls: list[tuple[int, tuple[int, ...]]] = []

    async def fake_get_rating_preload_for_sessions(
        sid: int, sessions: tuple[Any, ...]
    ) -> RatingPreload:
        calls.append((sid, tuple(session.user_id for session in sessions)))
        return preload

    monkeypatch.setattr(
        tracker,
        "_get_rating_preload_for_sessions",
        fake_get_rating_preload_for_sessions,
    )

    asyncio.run(tracker.update_all(1))

    assert calls == [(1, (2, 3, 1))]
    assert first.seen_preloads == [preload]
    assert second.seen_preloads == [preload]
    assert anonymous.seen_preloads == [preload]


def test_websocket_update_all_falls_back_when_preload_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tracker = WebsocketTrackerForStation()
    websocket = FakeWebsocket(2)
    tracker.append(cast(Any, websocket))

    async def failing_get_rating_preload_for_sessions(
        sid: int, sessions: tuple[Any, ...]
    ) -> RatingPreload:
        raise RuntimeError("preload failed")

    monkeypatch.setattr(
        tracker,
        "_get_rating_preload_for_sessions",
        failing_get_rating_preload_for_sessions,
    )

    asyncio.run(tracker.update_all(1))

    assert websocket.seen_preloads == [None]
