from psycopg import sql

from common.db.build_insert import build_insert_on_conflict_do_update
from common.db.cursor import RainwaveCursor


async def set_album_fave(
    cursor: RainwaveCursor, album_id: int, user_id: int, fave: bool
) -> None:
    to_upsert = {
        "album_id": album_id,
        "user_id": user_id,
        "album_fave": fave,
    }
    await cursor.update(
        build_insert_on_conflict_do_update(
            "r4_album_faves",
            to_upsert,
            sql.SQL("(user_id, album_id)"),
        ),
        to_upsert,
    )
