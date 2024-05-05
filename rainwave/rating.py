from time import time as timestamp

from libs import db
from libs import log
from libs import cache
from libs import config


def rating_calculator(ratings):
    """
    Send in an SQL cursor that's the entire result of a query that has 2 columns: 'rating' and 'count'.
    Uses "rating_map" from config to map each rating tier's to the fraction of point(s) it should get.
    Returns a set: (points, potential_points)
    """
    point_map = config.get("rating_map")
    points = 0.0
    potential_points = 0.0
    for row in ratings:
        tier_points = 0
        potential_points += row["count"]
        for tier in point_map:
            if row["rating"] >= tier["threshold"]:
                tier_points = row["count"] * tier["points"]
        points += tier_points
    points = min(potential_points, max(0, points))

    return (points, potential_points)


def get_song_rating(song_id, user_id):
    rating = cache.get_song_rating(song_id, user_id)
    if not rating:
        rating = db.c.fetch_row(
            "SELECT song_rating_user AS rating_user, song_fave AS fave FROM r4_song_ratings WHERE user_id = %s AND song_id = %s",
            (user_id, song_id),
        )
        if not rating:
            rating = {"rating_user": 0, "fave": None}
    cache.set_song_rating(song_id, user_id, rating)
    return rating


def get_album_rating(sid, album_id, user_id):
    rating = cache.get_album_rating(sid, album_id, user_id)
    if not rating:
        rating = db.c.fetch_row(
            "SELECT album_rating_user AS rating_user, album_rating_complete AS rating_complete "
            "FROM r4_album_ratings "
            "WHERE user_id = %s AND album_id = %s AND sid = %s",
            (user_id, album_id, sid),
        )
        if not rating:
            rating = {"rating_user": 0, "rating_complete": False}
        rating["fave"] = (
            db.c.fetch_var(
                "SELECT album_fave FROM r4_album_faves WHERE user_id = %s AND album_id = %s",
                (user_id, album_id),
            )
            or False
        )
    cache.set_album_rating(sid, album_id, user_id, rating)
    return rating


CLEAR_RATING_FLAG = "__clear_rating__"


def set_song_rating(sid, song_id, user_id, rating=None, fave=None):
    db.c.start_transaction()
    try:
        existing_rating = db.c.fetch_row(
            "SELECT song_rating_user, song_fave FROM r4_song_ratings WHERE song_id = %s AND user_id = %s",
            (song_id, user_id),
        )
        count = (
            db.c.fetch_var(
                "SELECT COUNT(*) FROM r4_song_ratings WHERE user_id = %s", (user_id,)
            )
            or 0
        )
        if not existing_rating:
            count += 1
        if existing_rating:
            if rating is None:
                rating = existing_rating["song_rating_user"]
            elif rating == CLEAR_RATING_FLAG:
                rating = None
            if fave is None:
                fave = existing_rating["song_fave"]
            db.c.update(
                "UPDATE r4_song_ratings "
                "SET song_rating_user = %s, song_fave = %s, song_rated_at = %s "
                "WHERE user_id = %s AND song_id = %s",
                (rating, fave, timestamp(), user_id, song_id),
            )
        else:
            if not rating or rating == CLEAR_RATING_FLAG:
                rating = None
            if not fave:
                fave = None
            db.c.update(
                "INSERT INTO r4_song_ratings "
                "(song_rating_user, song_fave, song_rated_at, user_id, song_id) "
                "VALUES (%s, %s, %s, %s, %s)",
                (rating, fave, timestamp(), user_id, song_id),
            )

        db.c.update(
            "UPDATE phpbb_users SET radio_totalratings = %s, radio_inactive = FALSE, radio_last_active = %s WHERE user_id = %s",
            (count, timestamp(), user_id),
        )

        albums = update_album_ratings(sid, song_id, user_id)
        db.c.commit()
        cache.set_song_rating(song_id, user_id, {"rating_user": rating, "fave": fave})
        return albums
    except:
        db.c.rollback()
        raise


def clear_song_rating(sid, song_id, user_id):
    return set_song_rating(sid, song_id, user_id, rating=CLEAR_RATING_FLAG)


def set_song_fave(song_id, user_id, fave):
    db.c.start_transaction()
    exists = db.c.fetch_row(
        "SELECT * FROM r4_song_ratings WHERE song_id = %s AND user_id = %s",
        (song_id, user_id),
    )
    rating = None
    if exists:
        rating = exists["song_rating_user"]
        if (
            db.c.update(
                "UPDATE r4_song_ratings SET song_fave = %s WHERE song_id = %s AND user_id = %s",
                (fave, song_id, user_id),
            )
            == 0
        ):
            log.debug(
                "rating",
                "Failed to update record for fave song %s, fave is: %s."
                % (song_id, fave),
            )
            return False
    elif not exists and fave:
        if (
            db.c.update(
                "INSERT INTO r4_song_ratings (song_id, user_id, song_fave) VALUES (%s, %s, %s)",
                (song_id, user_id, fave),
            )
            == 0
        ):
            log.debug(
                "rating",
                "Failed to insert record for song fave %s, fave is: %s."
                % (song_id, fave),
            )
            return False
    else:
        # Nothing to do!
        return True

    cache.set_song_rating(song_id, user_id, {"rating_user": rating, "fave": fave})
    db.c.commit()
    return True


def set_album_fave(sid, album_id, user_id, fave):
    db.c.start_transaction()
    exists = db.c.fetch_row(
        "SELECT * FROM r4_album_faves WHERE album_id = %s AND user_id = %s",
        (album_id, user_id),
    )
    rating = None
    rating_complete = False
    if not exists:
        if (
            db.c.update(
                "INSERT INTO r4_album_faves (album_id, user_id, album_fave) VALUES (%s, %s, %s)",
                (album_id, user_id, fave),
            )
            == 0
        ):
            log.debug(
                "rating",
                "Failed to insert record for fave %s %s, fave is: %s."
                % ("album", album_id, fave),
            )
            return False
    else:
        if (
            db.c.update(
                "UPDATE r4_album_faves SET album_fave = %s WHERE album_id = %s AND user_id = %s",
                (fave, album_id, user_id),
            )
            == 0
        ):
            log.debug(
                "rating",
                "Failed to update record for fave %s %s, fave is: %s."
                % ("album", album_id, fave),
            )
            return False
    cache.set_album_rating(
        sid,
        album_id,
        user_id,
        {"rating_user": rating, "fave": fave, "rating_complete": rating_complete},
    )
    db.c.commit()
    return True


def update_album_ratings(target_sid, song_id, user_id):
    toret = []
    for row in db.c.fetch_all(
        "SELECT r4_songs.album_id, sid, album_song_count FROM r4_songs JOIN r4_album_sid USING (album_id) WHERE r4_songs.song_id = %s AND album_exists = TRUE",
        (song_id,),
    ):
        album_id = row["album_id"]
        sid = row["sid"]
        num_songs = row["album_song_count"]
        user_data = db.c.fetch_row(
            "SELECT ROUND(CAST(AVG(song_rating_user) AS NUMERIC), 1) AS rating_user, "
            "COUNT(song_rating_user) AS rating_user_count "
            "FROM r4_songs "
            "JOIN r4_song_sid USING (song_id) "
            "JOIN r4_song_ratings USING (song_id) "
            "WHERE album_id = %s AND sid = %s AND song_exists = TRUE AND user_id = %s",
            (album_id, sid, user_id),
        )
        rating_complete = False
        if user_data and user_data["rating_user_count"] >= num_songs:
            rating_complete = True
        album_rating = None
        if user_data and user_data["rating_user"]:
            album_rating = float(user_data["rating_user"])

        existing_rating = db.c.fetch_row(
            "SELECT album_rating_user FROM r4_album_ratings WHERE album_id = %s AND user_id = %s AND sid = %s",
            (album_id, user_id, sid),
        )
        if existing_rating:
            db.c.update(
                "UPDATE r4_album_ratings SET album_rating_user = %s, album_rating_complete = %s WHERE user_id = %s AND album_id = %s AND sid = %s",
                (album_rating, rating_complete, user_id, album_id, sid),
            )
        else:
            db.c.update(
                "INSERT INTO r4_album_ratings (album_rating_user, album_rating_complete, user_id, album_id, sid) VALUES (%s, %s, %s, %s, %s)",
                (album_rating, rating_complete, user_id, album_id, sid),
            )
        cache.set_album_rating(
            sid,
            album_id,
            user_id,
            {"rating_user": album_rating, "rating_complete": rating_complete},
        )
        if target_sid == sid:
            toret.append(
                {
                    "sid": sid,
                    "id": album_id,
                    "rating_user": album_rating,
                    "rating_complete": rating_complete,
                }
            )
    return toret
