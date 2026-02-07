from time import time as timestamp
from typing import TypedDict

from backend import config
from backend.libs import log
from backend.db.cursor import RainwaveCursor


class CooldownConfig(TypedDict):
    time: int
    sum_aasl: int
    avg_album_rating: float
    multiplier_adjustment: float
    base_album_cool: int
    base_rating: float
    min_album_cool: float
    max_album_cool: float
    average_song_length: float
    max_song_cool: float
    min_song_cool: float


cooldown_config_defaults: CooldownConfig = {
    "time": 0,
    "sum_aasl": 100000,
    "avg_album_rating": 3.5,
    "multiplier_adjustment": 1,
    "base_album_cool": 100000,
    "base_rating": 4,
    "min_album_cool": 100000,
    "max_album_cool": 100000,
    "average_song_length": 160,
    "max_song_cool": 30000,
    "min_song_cool": 10000,
}

cooldown_config: dict[int, CooldownConfig] = {}


async def prepare_cooldown_algorithm(cursor: RainwaveCursor, sid: int) -> None:
    """
    Prepares pre-calculated variables that relate to calculating cooldown.
    Should pull all variables fresh from the DB, for algorithm
    refer to jfinalfunk.
    """
    global cooldown_config

    if not sid in cooldown_config:
        cooldown_config[sid] = cooldown_config_defaults.copy()
    if cooldown_config[sid]["time"] > (timestamp() - 3600):
        return

    # Variable names from here on down are from jf's proposal at: http://rainwave.cc/forums/viewtopic.php?f=13&t=1267
    sum_aasl = await cursor.fetch_guaranteed(
        """
        SELECT SUM(aasl) FROM (
            SELECT AVG(song_length) AS aasl 
            FROM r4_album_sid 
                JOIN r4_songs USING (album_id) 
                JOIN r4_song_sid USING (song_id) 
            WHERE r4_album_sid.sid = %s AND r4_songs.song_verified = TRUE 
            GROUP BY r4_album_sid.album_id
        ) AS jfiscrazy
""",
        (sid,),
        default=cooldown_config_defaults["sum_aasl"],
        var_type=float,
    )
    log.debug("cooldown", "SID %s: sumAASL: %s" % (sid, sum_aasl))

    avg_album_rating = await cursor.fetch_guaranteed(
        "SELECT AVG(album_rating) FROM r4_album_sid WHERE r4_album_sid.sid = %s AND r4_album_sid.album_exists = TRUE",
        (sid,),
        default=cooldown_config_defaults["avg_album_rating"],
        var_type=float,
    )
    avg_album_rating = min(max(1, avg_album_rating), 5)
    log.debug("cooldown", "SID %s: avg_album_rating: %s" % (sid, avg_album_rating))

    multiplier_adjustment = await cursor.fetch_guaranteed(
        """
        SELECT SUM(tempvar) FROM (
            SELECT r4_album_sid.album_id, AVG(album_cool_multiply) * AVG(song_length) AS tempvar 
            FROM r4_album_sid 
                JOIN r4_songs USING (album_id) 
                JOIN r4_song_sid USING (song_id) 
            WHERE r4_album_sid.sid = %s AND r4_songs.song_verified = TRUE 
            GROUP BY r4_album_sid.album_id) AS hooooboy
""",
        (sid,),
        default=cooldown_config_defaults["multiplier_adjustment"],
        var_type=float,
    )
    multiplier_adjustment = multiplier_adjustment / sum_aasl
    multiplier_adjustment = min(max(0.5, multiplier_adjustment), 4)
    log.debug("cooldown", "SID %s: multi: %s" % (sid, multiplier_adjustment))

    base_album_cool = (
        config.stations[sid]["cooldown_percentage"] * sum_aasl / multiplier_adjustment
    )
    base_album_cool = max(min(base_album_cool, 1000000), 1)
    log.debug("cooldown", "SID %s: base_album_cool: %s" % (sid, base_album_cool))

    base_rating = await cursor.fetch_guaranteed(
        """
        SELECT SUM(tempvar) FROM (
            SELECT r4_album_sid.album_id, AVG(album_rating) * AVG(song_length) AS tempvar 
            FROM r4_album_sid 
                JOIN r4_songs USING (album_id) 
                JOIN r4_song_sid USING (song_id) 
            WHERE r4_album_sid.sid = %s AND r4_songs.song_verified = TRUE 
            GROUP BY r4_album_sid.album_id
        ) AS hooooboy
""",
        (sid,),
        default=cooldown_config_defaults["base_rating"],
        var_type=float,
    )
    base_rating = min(max(1, base_rating / sum_aasl), 5)
    log.debug("cooldown", "SID %s: base rating: %s" % (sid, base_rating))

    min_album_cool = (
        config.stations[sid]["cooldown_highest_rating_multiplier"] * base_album_cool
    )
    log.debug("cooldown", "SID %s: min_album_cool: %s" % (sid, min_album_cool))

    max_album_cool = min_album_cool + (
        (5 - 2.5) * ((base_album_cool - min_album_cool) / (5 - base_rating))
    )
    log.debug("cooldown", "SID %s: max_album_cool: %s" % (sid, max_album_cool))

    cooldown_config[sid]["sum_aasl"] = int(sum_aasl)
    cooldown_config[sid]["avg_album_rating"] = float(avg_album_rating)
    cooldown_config[sid]["multiplier_adjustment"] = float(multiplier_adjustment)
    cooldown_config[sid]["base_album_cool"] = int(base_album_cool)
    cooldown_config[sid]["base_rating"] = float(base_rating)
    cooldown_config[sid]["min_album_cool"] = int(min_album_cool)
    cooldown_config[sid]["max_album_cool"] = int(max_album_cool)
    cooldown_config[sid]["time"] = int(timestamp())

    average_song_length = await cursor.fetch_guaranteed(
        "SELECT AVG(song_length) FROM r4_songs JOIN r4_song_sid USING (song_id) WHERE song_exists = TRUE AND sid = %s",
        (sid,),
        default=cooldown_config_defaults["average_song_length"],
        var_type=float,
    )
    log.debug(
        "cooldown", "SID %s: average_song_length: %s" % (sid, average_song_length)
    )
    cooldown_config[sid]["average_song_length"] = float(average_song_length)

    number_songs = await cursor.fetch_guaranteed(
        "SELECT COUNT(song_id) FROM r4_song_sid WHERE song_exists = TRUE AND sid = %s",
        (sid,),
        default=1,
        var_type=int,
    )
    log.debug("cooldown", "SID %s: number_songs: %s" % (sid, number_songs))

    cooldown_config[sid]["max_song_cool"] = float(average_song_length) * (
        number_songs * config.stations[sid]["cooldown_song_max_multiplier"]
    )

    cooldown_config[sid]["min_song_cool"] = (
        cooldown_config[sid]["max_song_cool"]
        * config.stations[sid]["cooldown_song_min_multiplier"]
    )
