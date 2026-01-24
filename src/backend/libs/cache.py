from src.backend.config import config
from libs import db
from pymemcache.client.base import Client
from pymemcache.serde import pickle_serde
from web_api.exceptions import APIException
from typing import Any, Iterable


class TestModeCache:
    def __init__(self) -> None:
        self.vars = {}

    def get(self, key: str) -> Any | None:
        if not key in self.vars:
            return None
        else:
            return self.vars[key]

    def set(self, key: str, value: Any) -> None:
        self.vars[key] = value


_memcache: Client | TestModeCache | None = None
_memcache_ratings: Client | TestModeCache | None = None

local: dict[str, Any] = {}


def connect() -> None:
    global _memcache
    global _memcache_ratings

    if _memcache:
        return
    if config.memcache_fake:
        _memcache = TestModeCache()
        _memcache_ratings = TestModeCache()
        reset_station_caches()
    else:
        _memcache = _build_memcache_client([config.memcache_server])
        # memcache doesn't test its connection on start, so we force a get
        _memcache.get("hello")

        _memcache_ratings = _build_memcache_client([config.memcache_ratings_server])
        _memcache_ratings.get("hello")


def _build_memcache_client(servers: list[str]) -> Client:
    server = servers[0]
    if ":" in server:
        host, port_text = server.rsplit(":", 1)
        address = (host, int(port_text))
    else:
        address = (server, 11211)

    return Client(
        address,
        connect_timeout=config.memcache_connect_timeout,
        timeout=config.memcache_timeout,
        serde=pickle_serde,
    )


def set_global(key: str, value: Any, save_local: bool = False) -> None:
    if not _memcache:
        raise APIException("internal_error", "No memcache connection.", http_code=500)
    if save_local or key in local:
        local[key] = value
    _memcache.set(key, value)


def get(key: str) -> Any:
    if not _memcache:
        raise APIException("internal_error", "No memcache connection.", http_code=500)
    if key in local:
        return local[key]
    return _memcache.get(key)


def set_user(user: Any, key: str, value: Any) -> None:
    if user.__class__.__name__ == "int" or user.__class__.__name__ == "long":
        set_global("u%s_%s" % (user, key), value)
    else:
        set_global("u%s_%s" % (user.id, key), value)


def get_user(user: Any, key: str) -> Any:
    if user.__class__.__name__ == "int" or user.__class__.__name__ == "long":
        return get("u%s_%s" % (user, key))
    else:
        return get("u%s_%s" % (user.id, key))


def set_station(sid: int, key: str, value: Any, save_local: bool = False) -> None:
    set_global("sid%s_%s" % (sid, key), value, save_local)


def get_station(sid: int, key: str) -> Any:
    return get("sid%s_%s" % (sid, key))


def set_song_rating(song_id: int, user_id: int, rating: Any) -> None:
    if not _memcache_ratings:
        raise APIException("internal_error", "No memcache connection.", http_code=500)
    _memcache_ratings.set("rating_song_%s_%s" % (song_id, user_id), rating)


def get_song_rating(song_id: int, user_id: int) -> Any:
    if not _memcache_ratings:
        raise APIException("internal_error", "No memcache connection.", http_code=500)
    return _memcache_ratings.get("rating_song_%s_%s" % (song_id, user_id))


def set_album_rating(sid: int, album_id: int, user_id: int, rating: Any) -> None:
    if not _memcache_ratings:
        raise APIException("internal_error", "No memcache connection.", http_code=500)
    _memcache_ratings.set("rating_album_%s_%s_%s" % (sid, album_id, user_id), rating)


def set_album_faves(sid: int, album_id: int, user_id: int, fave: Any) -> None:
    rating = get_album_rating(sid, album_id, user_id)
    if rating:
        rating["album_fave"] = fave
        set_album_rating(sid, album_id, user_id, rating)


def get_album_rating(sid: int, album_id: int, user_id: int) -> Any:
    if not _memcache_ratings:
        raise APIException("internal_error", "No memcache connection.", http_code=500)
    return _memcache_ratings.get("rating_album_%s_%s_%s" % (sid, album_id, user_id))


def prime_rating_cache_for_events(
    sid: int, events: Iterable[Any], songs: Iterable[Any] | None = None
) -> None:
    for e in events:
        for song in e.songs:
            prime_rating_cache_for_song(song, sid)
    if songs:
        for song in songs:
            prime_rating_cache_for_song(song, sid)


def prime_rating_cache_for_song(song: Any, sid: int) -> None:
    for user_id, rating in song.get_all_ratings().items():
        set_song_rating(song.id, user_id, rating)
    if song.album:
        for user_id, rating in song.album.get_all_ratings(sid).items():
            set_album_rating(sid, song.album.id, user_id, rating)


def refresh_local(key: str) -> None:
    if not _memcache:
        raise APIException("internal_error", "No memcache connection.", http_code=500)
    local[key] = _memcache.get(key)


def refresh_local_station(sid: int, key: str) -> None:
    if not _memcache:
        raise APIException("internal_error", "No memcache connection.", http_code=500)
    # we can't use the normal get functions here since they'll ping what's already in local
    local["sid%s_%s" % (sid, key)] = _memcache.get("sid%s_%s" % (sid, key))


def update_local_cache_for_sid(sid: int) -> None:
    refresh_local_station(sid, "album_diff")
    refresh_local_station(sid, "sched_next")
    refresh_local_station(sid, "sched_history")
    refresh_local_station(sid, "sched_current")
    refresh_local_station(sid, "sched_next_dict")
    refresh_local_station(sid, "sched_history_dict")
    refresh_local_station(sid, "sched_current_dict")
    refresh_local_station(sid, "current_listeners")
    refresh_local_station(sid, "request_line")
    refresh_local_station(sid, "request_user_positions")
    refresh_local_station(sid, "user_rating_acl")
    refresh_local_station(sid, "user_rating_acl_song_index")
    refresh_local("request_expire_times")

    all_stations = {}
    for station_id in config.station_ids:
        all_stations[station_id] = get_station(station_id, "all_station_info")
    set_global("all_stations_info", all_stations)


def reset_station_caches() -> None:
    set_global("request_expire_times", None, True)
    for sid in config.station_ids:
        set_station(sid, "album_diff", None, True)
        set_station(sid, "sched_next", None, True)
        set_station(sid, "sched_history", None, True)
        set_station(sid, "sched_current", None, True)
        set_station(sid, "current_listeners", None, True)
        set_station(sid, "request_line", None, True)
        set_station(sid, "request_user_positions", None, True)
        set_station(sid, "user_rating_acl", None, True)
        set_station(sid, "user_rating_acl_song_index", None, True)


def update_user_rating_acl(sid: int, song_id: int) -> None:
    users = get_station(sid, "user_rating_acl")
    if not users:
        users = {}
    songs = get_station(sid, "user_rating_acl_song_index")
    if not songs:
        songs = []

    while len(songs) > 5:
        to_remove = songs.pop(0)
        if to_remove in users:
            del users[to_remove]
    songs.append(song_id)
    users[song_id] = {}

    for user_id in db.c.fetch_list(
        "SELECT user_id FROM r4_listeners WHERE sid = %s AND user_id > 1", (sid,)
    ):
        users[song_id][user_id] = True

    set_station(sid, "user_rating_acl", users, True)
    set_station(sid, "user_rating_acl_song_index", songs, True)
