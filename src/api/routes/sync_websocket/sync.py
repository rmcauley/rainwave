sessions = {}
delayed_live_vote = {}
delayed_live_vote_timers = {}
websocket_allow_from = "*"
votes_by = {}
last_vote_by = {}
vote_once_every_seconds = 5  # how many seconds have to pass before a user has their vote live broadcast if they're spamming


def init() -> None:
    global sessions
    global websocket_allow_from

    for sid in config.station_ids:
        sessions[sid] = SessionBank()
        delayed_live_vote[sid] = None
        delayed_live_vote_timers[sid] = None
    websocket_allow_from = config.websocket_allow_from
    tornado.ioloop.PeriodicCallback(_keep_all_alive, 30000).start()
    zeromq.set_sub_callback(_on_zmq)


def _keep_all_alive() -> None:
    global sessions
    for sid in sessions:
        sessions[sid].keep_alive()
