def delay_live_vote_removal(sid: int) -> None:
    if delayed_live_vote_timers[sid]:
        tornado.ioloop.IOLoop.instance().remove_timeout(delayed_live_vote_timers[sid])
        delayed_live_vote[sid] = None
        delayed_live_vote_timers[sid] = None


def delay_live_vote(message: dict[str, typing.Any]) -> None:
    delayed_live_vote_timers[
        message["sid"]
    ] = tornado.ioloop.IOLoop.instance().add_timeout(
        datetime.timedelta(seconds=vote_once_every_seconds),
        lambda: process_delayed_live_vote(message["sid"]),
    )


def process_delayed_live_vote(sid: int) -> None:
    delayed_live_vote_timers[sid] = None
    if not delayed_live_vote[sid]:
        return
    sessions[sid].send_to_all(None, delayed_live_vote[sid]["data"])
    delayed_live_vote[sid] = None
