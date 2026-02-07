from time import time as timestamp
from typing import TypedDict

from backend.db.cursor import RainwaveCursor, RainwaveCursorTx
from backend.playlist.metadata import MetadataInsertionError
from backend.playlist.remove_diacritics import remove_diacritics


class SongGroupRow(TypedDict):
    group_id: int
    group_name: str
    group_name_searchable: str
    group_elec_block: int


class SongGroup:
    data: SongGroupRow

    select_by_name_query = "SELECT group_id AS id, group_name AS name, group_elec_block AS elec_block, group_cool_time AS cool_time FROM r4_groups WHERE lower(group_name) = lower(%s)"
    select_by_id_query = "SELECT group_id AS id, group_name AS name, group_elec_block AS elec_block, group_cool_time AS cool_time FROM r4_groups WHERE group_id = %s"
    select_by_song_id_query = "SELECT r4_groups.group_id AS id, r4_groups.group_name AS name, group_elec_block AS elec_block, group_cool_time AS cool_time, group_is_tag AS is_tag FROM r4_song_group JOIN r4_groups USING (group_id) WHERE song_id = %s ORDER BY group_name"
    disassociate_song_id_query = (
        "DELETE FROM r4_song_group WHERE song_id = %s AND group_id = %s"
    )
    associate_song_id_query = "INSERT INTO r4_song_group (song_id, group_id, group_is_tag) VALUES (%s, %s, %s)"
    has_song_id_query = (
        "SELECT COUNT(song_id) FROM r4_song_group WHERE song_id = %s AND group_id = %s"
    )
    check_self_size_query = "SELECT COUNT(song_id) FROM r4_song_group JOIN r4_songs USING (song_id) WHERE group_id = %s AND song_verified = TRUE"
    delete_self_query = "DELETE FROM r4_groups WHERE group_id = %s"

    def __init__(self, data: SongGroupRow):
        self.data = data

    @staticmethod
    async def upsert(cursor: RainwaveCursor | RainwaveCursorTx, name: str) -> SongGroup:
        row = await cursor.fetch_row(
            """
            INSERT INTO r4_groups (group_name, group_name_searchable) VALUES (%s, %s, %s)
            ON CONFLICT DO NOTHING
            RETURNING *
""",
            (name, remove_diacritics(name)),
            row_type=SongGroupRow,
        )
        if not row:
            raise MetadataInsertionError(f"Could not upsert group with name {name}")
        return SongGroup(row)

    async def reconcile_sids(self, cursor: RainwaveCursor | RainwaveCursorTx) -> None:
        new_sids_all = cursor.fetch_all(
            """
                SELECT
                    sid,
                    COUNT(DISTINCT album_id)
                FROM r4_song_group
                    JOIN r4_song_sid USING (song_id)
                    JOIN r4_songs USING (song_id)
                WHERE group_id = %s
                    AND song_exists = TRUE
                    AND song_verified = TRUE
                GROUP BY sid
""",
            (self.id,),
        )
        new_sids = [row["sid"] for row in new_sids_all]
        for sid in config.station_ids:
            existing = await cursor.fetch_row(
                "SELECT group_display FROM r4_group_sid WHERE group_id = %s AND sid = %s",
                (self.id, sid),
            )
            if existing:
                if sid in new_sids:
                    await cursor.update(
                        "UPDATE r4_group_sid SET group_display = TRUE WHERE group_id = %s",
                        (self.id,),
                    )
                else:
                    await cursor.update(
                        "UPDATE r4_group_sid SET group_display = FALSE WHERE group_id = %s",
                        (self.id,),
                    )
            elif sid in new_sids:
                await cursor.update(
                    "INSERT INTO r4_group_sid (group_id, sid, group_display) VALUES (%s, %s, TRUE)",
                    (self.id, sid),
                )

    def _start_cooldown_db(self, sid: int, cool_time: int) -> None:
        if config.has_station(
            sid, "cooldown_enable_for_categories"
        ) and not config.get_station(sid, "cooldown_enable_for_categories"):
            return

        cool_end = int(cool_time + timestamp())
        log.debug(
            "cooldown",
            "Group ID %s Station ID %s cool_time period: %s"
            % (self.id, sid, cool_time),
        )
        # Make sure to update both the if and else SQL statements if doing any updates
        await cursor.update(
            """
UPDATE r4_song_sid
SET song_cool = TRUE,
    song_cool_end = %s
FROM r4_song_group
WHERE r4_song_sid.song_id = r4_song_group.song_id
    AND r4_song_group.group_id = %s
    AND r4_song_sid.sid = %s
    AND r4_song_sid.song_exists = TRUE
    AND r4_song_sid.song_cool_end <= %s
""",
            (cool_end, self.id, sid, cool_end),
        )
        request_only_end = cool_end + 300
        await cursor.update(
            """
UPDATE r4_song_sid
SET song_request_only = TRUE,
    song_request_only_end = %s
FROM r4_song_group
WHERE r4_song_sid.song_id = r4_song_group.song_id
    AND r4_song_group.group_id = %s
    AND r4_song_sid.sid = %s
    AND r4_song_sid.song_exists = TRUE
    AND r4_song_sid.song_cool_end <= %s
    AND song_request_only_end IS NOT NULL
""",
            (request_only_end, self.id, sid, cool_end),
        )

    def _start_election_block_db(self, sid: int, num_elections: int) -> None:
        # refer to song.set_election_block for base SQL
        await cursor.update(
            """
UPDATE r4_song_sid
SET song_elec_blocked = TRUE,
    song_elec_blocked_by = %s,
    song_elec_blocked_num = %s
FROM r4_song_group
WHERE r4_song_sid.song_id = r4_song_group.song_id
    AND r4_song_group.group_id = %s
    AND r4_song_sid.sid = %s
    AND song_elec_blocked_num < %s
""",
            ("group", num_elections, self.id, sid, num_elections),
        )

    def set_elec_block(self, num_elections: int) -> None:
        await cursor.update(
            "UPDATE r4_groups SET group_elec_block = %s WHERE group_id = %s",
            (num_elections, self.id),
        )

    def set_cooldown(self, cooldown: int) -> None:
        await cursor.update(
            "UPDATE r4_groups SET group_cool_time = %s WHERE group_id = %s",
            (cooldown, self.id),
        )

    def load_songs_from_sid(self, sid: int, user_id: int) -> None:
        all_songs = await cursor.fetch_all(
            """
SELECT
    r4_song_group.song_id AS id,
    song_title AS title,
    CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating,
    TRUE AS requestable,
    song_length AS length,
    song_cool AS cool,
    song_cool_end AS cool_end,
    song_url as url,
    song_link_text as link_text,
    song_artist_parseable AS artist_parseable,
    COALESCE(song_rating_user, 0) AS rating_user,
    COALESCE(song_fave, FALSE) AS fave,
    album_name,
    r4_albums.album_id
FROM r4_song_group
JOIN r4_song_sid
    ON (r4_song_group.song_id = r4_song_sid.song_id AND r4_song_sid.sid = %s)
JOIN r4_songs
    ON (r4_song_group.song_id = r4_songs.song_id)
JOIN r4_albums USING (album_id)
LEFT JOIN r4_album_sid
    ON (r4_albums.album_id = r4_album_sid.album_id AND r4_album_sid.sid = %s)
LEFT JOIN r4_song_ratings
    ON (r4_song_group.song_id = r4_song_ratings.song_id AND r4_song_ratings.user_id = %s)
WHERE r4_song_group.group_id = %s
    AND r4_songs.song_verified = TRUE
    AND r4_song_sid.song_exists = TRUE
ORDER BY album_name,
    song_title
""",
            (sid, sid, user_id, self.id),
        )
        # And of course, now we have to burn extra CPU cycles to make sure the right album name is used and that we present the data
        # in the same format seen everywhere else on the API.  Still, much faster then loading individual song objects.
        self.data["all_songs_for_sid"] = {}
        requestable = True if user_id > 1 else False
        for song in all_songs:
            song["requestable"] = requestable and song["requestable"]
            if not song["album_id"] in self.data["all_songs_for_sid"]:
                self.data["all_songs_for_sid"][song["album_id"]] = []
            self.data["all_songs_for_sid"][song["album_id"]].append(song)
            song["albums"] = [
                {
                    "name": song.pop("album_name"),
                    "id": song.pop("album_id"),
                }
            ]
