import asyncio
import logging
from typing import TypedDict

from common import log
from common.cache.cache import cache_connect
from common.db.connection import db_connect
from common.db.cursor import get_cursor
from common.playlist.song_group.song_group import SongGroup


class RecalculateSongGroupRow(TypedDict):
    group_id: int
    group_name: str
    group_name_searchable: str
    group_elec_block: int


async def main() -> None:
    log.init(log_stdout_level=logging.DEBUG)
    async with db_connect(auto_retry=False), cache_connect(), get_cursor() as cursor:
        max_id = await cursor.fetch_guaranteed(
            "SELECT max(group_id) AS max_group_id FROM r4_groups",
            params=None,
            default=0,
            var_type=int,
        )
        page_start_id = 0
        while True:
            groups = await cursor.fetch_all(
                "SELECT group_id, group_name, group_name_searchable, group_elec_block FROM r4_groups WHERE group_id > %s ORDER BY group_id LIMIT 100",
                params=(page_start_id,),
                row_type=RecalculateSongGroupRow,
            )

            if len(groups) == 0:
                break

            for group_row in groups:
                txt = "Group %s / %s" % (group_row["group_id"], max_id)
                txt += " " * (80 - len(txt))
                print("\r" + txt, end="")

                g = SongGroup(group_row)
                await g.reconcile_sids(cursor)

            page_start_id = groups[-1]["group_id"]

    print()
    print("Done")
    print()


if __name__ == "__main__":
    asyncio.run(main())
