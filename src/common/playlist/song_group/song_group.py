from typing import TypedDict

from common import config
from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.playlist.metadata import MetadataInsertionError
from common.playlist.remove_diacritics import remove_diacritics


class SongGroupRow(TypedDict):
    group_id: int
    group_name: str
    group_name_searchable: str
    group_elec_block: int


class ReconcileSidsRow(TypedDict):
    sid: int
    count: int


class SongGroup:
    id: int
    data: SongGroupRow

    def __init__(self, data: SongGroupRow):
        self.id = data["group_id"]
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
        new_sids_all = await cursor.fetch_all(
            """
                SELECT
                    sid,
                    COUNT(DISTINCT album_id) AS count
                FROM r4_song_group
                    JOIN r4_song_sid USING (song_id)
                    JOIN r4_songs USING (song_id)
                WHERE group_id = %s
                    AND song_exists = TRUE
                    AND song_verified = TRUE
                GROUP BY sid
""",
            (self.id,),
            row_type=ReconcileSidsRow,
        )
        new_sids = [row["sid"] for row in new_sids_all]
        for sid in config.station_ids:
            if sid in new_sids:
                await cursor.update(
                    """
                    INSERT INTO r4_group_sid (group_id, sid, group_display) VALUES (%s, %s, TRUE)
                    ON CONFLICT DO UPDATE SET group_display = TRUE
                """,
                    (self.id, self.data["group_name"]),
                )
            else:
                await cursor.update(
                    "DELETE FROM r4_group_sid WHERE group_id = %s AND sid = %s",
                    (self.id, sid),
                )

    async def start_election_block_db(
        self, cursor: RainwaveCursor | RainwaveCursorTx, sid: int, num_elections: int
    ) -> None:
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
