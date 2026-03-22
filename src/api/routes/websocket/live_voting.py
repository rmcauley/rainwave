import typing
from api.routes.websocket.vote_throttle_service.vote_throttle_service import (
    vote_throttle_service,
)


def delay_live_vote_removal(sid: int) -> None:
    vote_throttle_service.clear_delayed_live_vote(sid)


def delay_live_vote(message: dict[str, typing.Any]) -> None:
    vote_throttle_service.handle_delayed_live_voting_message(message)


def process_delayed_live_vote(sid: int) -> None:
    vote_throttle_service.flush_delayed_live_vote(sid)
