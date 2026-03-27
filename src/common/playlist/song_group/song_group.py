from typing import TypedDict

from psycopg import sql

from common import stations
from common.db.build_insert import build_insert, build_insert_on_conflict_do_update
from common.db.cursor import RainwaveCursor
from common.playlist.remove_diacritics import remove_diacritics


class CouldNotUpsertSongGroupError(Exception):
    pass


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
        super().__init__()
        self.id = data["group_id"]
        self.data = data

    @staticmethod
    async def upsert(cursor: RainwaveCursor, name: str) -> SongGroup:
        existing = await cursor.fetch_row(
            "SELECT group_id, group_name, group_name_searchable, group_elec_block FROM r4_groups WHERE group_name = %s",
            (name,),
            row_type=SongGroupRow,
        )

        if not existing:
            to_insert = {
                "group_name": name,
                "group_name_searchable": remove_diacritics(name),
            }
            inserted = await cursor.fetch_row(
                build_insert("r4_groups", to_insert) + sql.SQL(" RETURNING *"),
                to_insert,
                row_type=SongGroupRow,
            )
            if not inserted:
                raise CouldNotUpsertSongGroupError(
                    f"Could not upsert group with name {name}"
                )
            return SongGroup(inserted)

        return SongGroup(existing)

    async def reconcile_sids(self, cursor: RainwaveCursor) -> None:
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
        for sid in stations.station_ids:
            if sid in new_sids:
                to_upsert = {
                    "group_id": self.id,
                    "sid": sid,
                    "group_display": True,
                }
                await cursor.update(
                    build_insert_on_conflict_do_update(
                        "r4_group_sid", to_upsert, sql.SQL("(group_id, sid)")
                    ),
                    to_upsert,
                )
            else:
                await cursor.update(
                    "DELETE FROM r4_group_sid WHERE group_id = %s AND sid = %s",
                    (self.id, sid),
                )
