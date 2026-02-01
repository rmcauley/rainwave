from __future__ import annotations

import random

ANONYMOUS_USER_ID = 1
TUNED_IN_ANONYMOUS_IP = "127.0.0.1"
TUNED_OUT_ANONYMOUS_IP = "127.0.0.2"
ANONYMOUS_API_KEY = "ANON"
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


def populate_test_data(cursor, sid=1):
    rng = random.Random()

    cursor.update("INSERT INTO phpbb_ranks (rank_title) VALUES ('Test')")

    cursor.update(
        f"INSERT INTO phpbb_users (user_id, username) VALUES ({ANONYMOUS_USER_ID}, '{ANONYMOUS_USER_NAME}')"
    )
    cursor.update(
        f"INSERT INTO r4_api_keys (user_id, api_key) VALUES ({ANONYMOUS_USER_ID}, '{ANONYMOUS_API_KEY}')"
    )
    cursor.update(
        f"INSERT INTO r4_listeners (user_id, sid, listener_icecast_id, listener_ip) VALUES ({ANONYMOUS_USER_ID}, 1, 3, '{TUNED_IN_ANONYMOUS_IP}')"
    )

    cursor.update(
        f"INSERT INTO phpbb_users (user_id, username, group_id) VALUES ({SITE_ADMIN_USER_ID}, '{SITE_ADMIN_USER_NAME}', 5)"
    )
    cursor.update(
        f"INSERT INTO r4_api_keys (user_id, api_key) VALUES ({SITE_ADMIN_USER_ID}, '{SITE_ADMIN_API_KEY}')"
    )

    cursor.update(
        f"INSERT INTO phpbb_users (user_id, username, group_id) VALUES ({TUNED_IN_LOGGED_IN_USER_ID}, '{TUNED_IN_LOGGED_IN_USER_NAME}', 5)"
    )
    cursor.update(
        f"INSERT INTO r4_api_keys (user_id, api_key) VALUES ({TUNED_IN_LOGGED_IN_USER_ID}, '{TUNED_IN_LOGGED_IN_API_KEY}')"
    )
    cursor.update(
        f"INSERT INTO r4_listeners (user_id, sid, listener_icecast_id) VALUES ({TUNED_IN_LOGGED_IN_USER_ID}, 1, 1)"
    )

    cursor.update(
        f"INSERT INTO phpbb_users (user_id, username, group_id) VALUES ({TUNED_OUT_LOGGED_IN_USER_ID}, '{TUNED_OUT_LOGGED_IN_USER_NAME}', 5)"
    )
    cursor.update(
        f"INSERT INTO r4_api_keys (user_id, api_key) VALUES ({TUNED_OUT_LOGGED_IN_USER_ID}, '{TUNED_OUT_LOGGED_IN_API_KEY}')"
    )

    cursor.update(
        f"INSERT INTO phpbb_users (user_id, username, group_id) VALUES ({TUNED_IN_LOCKED_TO_OTHER_STATION_USER_ID}, '{TUNED_IN_LOCKED_TO_OTHER_STATION_USER_NAME}', 5)"
    )
    cursor.update(
        f"INSERT INTO r4_api_keys (user_id, api_key) VALUES ({TUNED_IN_LOCKED_TO_OTHER_STATION_USER_ID}, '{TUNED_IN_LOCKED_TO_OTHER_STATION_API_KEY}')"
    )
    cursor.update(
        f"INSERT INTO r4_listeners (user_id, sid, listener_icecast_id, listener_lock, listener_lock_sid, listener_lock_counter) VALUES ({TUNED_IN_LOCKED_TO_OTHER_STATION_USER_ID}, 1, 2, TRUE, 2, 5)"
    )

    group_ids = []
    for idx in range(1, 11):
        name = f"Group {idx}"
        group_id = cursor.fetch_var(
            "INSERT INTO r4_groups (group_name, group_name_searchable, group_elec_block, group_cool_time) "
            "VALUES (%s, %s, %s, %s) RETURNING group_id",
            (name, name.lower(), 0, 900),
        )
        group_ids.append(group_id)
        cursor.update(
            "INSERT INTO r4_group_sid (group_id, sid, group_display) VALUES (%s, %s, %s)",
            (group_id, sid, True),
        )

    artist_ids = []
    for idx in range(1, 101):
        name = f"Artist {idx}"
        artist_id = cursor.fetch_var(
            "INSERT INTO r4_artists (artist_name, artist_name_searchable) VALUES (%s, %s) RETURNING artist_id",
            (name, name.lower()),
        )
        artist_ids.append(artist_id)

    album_ids = []
    for idx in range(1, 101):
        name = f"Album {idx}"
        year = 2000 + (idx % 20)
        album_id = cursor.fetch_var(
            "INSERT INTO r4_albums (album_name, album_name_searchable, album_year) "
            "VALUES (%s, %s, %s) RETURNING album_id",
            (name, name.lower(), year),
        )
        album_ids.append((album_id, year))
        cursor.update(
            "INSERT INTO r4_album_sid (album_id, sid, album_song_count) VALUES (%s, %s, %s)",
            (album_id, sid, 20),
        )

    for album_id, year in album_ids:
        for track in range(1, 21):
            artist_id = rng.choice(artist_ids)
            group_id = rng.choice(group_ids)
            title = f"Song {album_id}-{track}"
            filename = (
                f"/tmp/rainwave_test/music/album_{album_id}/track_{track:02d}.mp3"
            )
            song_id = cursor.fetch_var(
                "INSERT INTO r4_songs (album_id, song_origin_sid, song_filename, song_title, "
                "song_title_searchable, song_length, song_track_number, song_disc_number, song_year) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING song_id",
                (album_id, sid, filename, title, title.lower(), 180, track, 1, year),
            )
            cursor.update(
                "INSERT INTO r4_song_sid (song_id, sid) VALUES (%s, %s)",
                (song_id, sid),
            )
            cursor.update(
                "INSERT INTO r4_song_artist (song_id, artist_id, artist_order, artist_is_tag) "
                "VALUES (%s, %s, %s, %s)",
                (song_id, artist_id, 0, True),
            )
            cursor.update(
                "INSERT INTO r4_song_group (song_id, group_id, group_is_tag) VALUES (%s, %s, %s)",
                (song_id, group_id, True),
            )
