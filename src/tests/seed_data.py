import random
import time

from psycopg import sql

from common.db.build_insert import build_insert
from common.db.cursor import RainwaveCursor

ANONYMOUS_USER_ID = 1
TUNED_IN_ANONYMOUS_IP = "127.0.0.1"
TUNED_OUT_ANONYMOUS_IP = "127.0.0.2"
ANONYMOUS_API_KEY = "ANON"
ANONYMOUS_LISTEN_KEY = "ANONLSTN"
ANONYMOUS_USER_NAME = "Anonymous"

SITE_ADMIN_USER_ID = 2
SITE_ADMIN_API_KEY = "ADMIN"
SITE_ADMIN_USER_NAME = "Admin"

TUNED_IN_LOGGED_IN_USER_ID = 3
TUNED_IN_LOGGED_IN_API_KEY = "TINLIN"
TUNED_IN_LOGGED_IN_USER_NAME = "Tuned In Logged In"

TUNED_OUT_LOGGED_IN_USER_ID = 4
TUNED_OUT_LOGGED_IN_API_KEY = "TOUTLIN"
TUNED_OUT_LOGGED_IN_USER_NAME = "Tuned In Logged Out"

TUNED_IN_LOCKED_TO_OTHER_STATION_USER_ID = 5
TUNED_IN_LOCKED_TO_OTHER_STATION_API_KEY = "LOCKED"
TUNED_IN_LOCKED_TO_OTHER_STATION_USER_NAME = "Tuned In Locked In"

TUNED_OUT_DONOR_USER_ID = 6
TUNED_OUT_DONOR_API_KEY = "DONOR"
TUNED_OUT_DONOR_USER_NAME = "Donor"


async def _insert(
    cursor: RainwaveCursor, table: str, values: dict[str, object]
) -> None:
    await cursor.update(build_insert(table, values), values)


async def _insert_returning_id(
    cursor: RainwaveCursor, table: str, values: dict[str, object], id_column: str
) -> int:
    inserted_id = await cursor.fetch_var(
        build_insert(table, values)
        + sql.SQL(" RETURNING {id_column}").format(id_column=sql.Identifier(id_column)),
        values,
        var_type=int,
    )
    if inserted_id is None:
        raise RuntimeError(f"Insert into {table} did not return {id_column}")
    return inserted_id


async def populate_test_data(cursor: RainwaveCursor, sid: int = 1) -> None:
    rng = random.Random()

    await _insert(cursor, "phpbb_ranks", {"rank_title": "Test"})

    await _insert(
        cursor,
        "phpbb_users",
        {"user_id": ANONYMOUS_USER_ID, "username": ANONYMOUS_USER_NAME},
    )
    await _insert(
        cursor,
        "r4_api_keys",
        {
            "user_id": ANONYMOUS_USER_ID,
            "api_key": ANONYMOUS_API_KEY,
            "api_key_listen_key": ANONYMOUS_LISTEN_KEY,
        },
    )
    await _insert(
        cursor,
        "r4_listeners",
        {
            "user_id": ANONYMOUS_USER_ID,
            "sid": sid,
            "listener_icecast_id": 3,
            "listener_ip": TUNED_IN_ANONYMOUS_IP,
            "listener_key": ANONYMOUS_LISTEN_KEY,
        },
    )

    # Group ID 5 for this user is the old phpBB "global administrator" group
    await _insert(
        cursor,
        "phpbb_users",
        {
            "user_id": SITE_ADMIN_USER_ID,
            "username": SITE_ADMIN_USER_NAME,
            "group_id": 5,
        },
    )
    await _insert(
        cursor,
        "r4_api_keys",
        {"user_id": SITE_ADMIN_USER_ID, "api_key": SITE_ADMIN_API_KEY},
    )

    await _insert(
        cursor,
        "phpbb_users",
        {
            "user_id": TUNED_IN_LOGGED_IN_USER_ID,
            "username": TUNED_IN_LOGGED_IN_USER_NAME,
            "group_id": 2,
        },
    )
    await _insert(
        cursor,
        "r4_api_keys",
        {
            "user_id": TUNED_IN_LOGGED_IN_USER_ID,
            "api_key": TUNED_IN_LOGGED_IN_API_KEY,
        },
    )
    await _insert(
        cursor,
        "r4_listeners",
        {
            "user_id": TUNED_IN_LOGGED_IN_USER_ID,
            "sid": sid,
            "listener_icecast_id": 1,
        },
    )

    await _insert(
        cursor,
        "phpbb_users",
        {
            "user_id": TUNED_OUT_LOGGED_IN_USER_ID,
            "username": TUNED_OUT_LOGGED_IN_USER_NAME,
            "group_id": 2,
        },
    )
    await _insert(
        cursor,
        "r4_api_keys",
        {
            "user_id": TUNED_OUT_LOGGED_IN_USER_ID,
            "api_key": TUNED_OUT_LOGGED_IN_API_KEY,
        },
    )

    await _insert(
        cursor,
        "phpbb_users",
        {
            "user_id": TUNED_IN_LOCKED_TO_OTHER_STATION_USER_ID,
            "username": TUNED_IN_LOCKED_TO_OTHER_STATION_USER_NAME,
            "group_id": 2,
        },
    )
    await _insert(
        cursor,
        "r4_api_keys",
        {
            "user_id": TUNED_IN_LOCKED_TO_OTHER_STATION_USER_ID,
            "api_key": TUNED_IN_LOCKED_TO_OTHER_STATION_API_KEY,
        },
    )
    await _insert(
        cursor,
        "r4_listeners",
        {
            "user_id": TUNED_IN_LOCKED_TO_OTHER_STATION_USER_ID,
            "sid": sid,
            "listener_icecast_id": 2,
            "listener_lock": True,
            "listener_lock_sid": 2,
            "listener_lock_counter": 5,
        },
    )

    # Group ID 8 for this user is the old phpBB "donor" group.
    await _insert(
        cursor,
        "phpbb_users",
        {
            "user_id": TUNED_OUT_DONOR_USER_ID,
            "username": TUNED_OUT_DONOR_USER_NAME,
            "group_id": 8,
        },
    )
    await _insert(
        cursor,
        "r4_api_keys",
        {"user_id": TUNED_OUT_DONOR_USER_ID, "api_key": TUNED_OUT_DONOR_API_KEY},
    )

    group_ids: list[int] = []
    for idx in range(1, 11):
        name = f"Group {idx}"
        group_id = await _insert_returning_id(
            cursor,
            "r4_groups",
            {
                "group_name": name,
                "group_name_searchable": name.lower(),
                "group_elec_block": 0,
                "group_cool_time": 900,
            },
            "group_id",
        )
        group_ids.append(group_id)
        await _insert(
            cursor,
            "r4_group_sid",
            {"group_id": group_id, "sid": sid, "group_display": True},
        )

    artist_ids: list[int] = []
    for idx in range(1, 101):
        name = f"Artist {idx}"
        artist_id = await _insert_returning_id(
            cursor,
            "r4_artists",
            {"artist_name": name, "artist_name_searchable": name.lower()},
            "artist_id",
        )
        artist_ids.append(artist_id)

    album_ids: list[tuple[int, int]] = []
    for idx in range(1, 101):
        name = f"Album {idx}"
        year = 2000 + (idx % 20)
        album_id = await _insert_returning_id(
            cursor,
            "r4_albums",
            {"album_name": name, "album_name_searchable": name.lower()},
            "album_id",
        )
        album_ids.append((album_id, year))
        await _insert(
            cursor,
            "r4_album_sid",
            {"album_id": album_id, "sid": sid, "album_song_count": 20},
        )

    for album_id, year in album_ids:
        for track in range(1, 21):
            artist_id = rng.choice(artist_ids)
            group_id = rng.choice(group_ids)
            title = f"Song {album_id}-{track}"
            filename = (
                f"/tmp/rainwave_test/music/album_{album_id}/track_{track:02d}.mp3"
            )
            song_id = await _insert_returning_id(
                cursor,
                "r4_songs",
                {
                    "album_id": album_id,
                    "song_origin_sid": sid,
                    "song_filename": filename,
                    "song_title": title,
                    "song_title_searchable": title.lower(),
                    "song_length": 180,
                    "song_track_number": track,
                    "song_disc_number": 1,
                    "song_year": year,
                    "song_file_mtime": int(time.time()),
                },
                "song_id",
            )
            await _insert(
                cursor,
                "r4_song_sid",
                {"song_id": song_id, "sid": sid},
            )
            await _insert(
                cursor,
                "r4_song_artist",
                {"song_id": song_id, "artist_id": artist_id, "artist_order": 0},
            )
            await _insert(
                cursor,
                "r4_song_group",
                {"song_id": song_id, "group_id": group_id},
            )
