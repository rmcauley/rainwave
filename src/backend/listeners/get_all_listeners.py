from typing import TypedDict

from backend.db.cursor import RainwaveCursor


class AllListenersRow(TypedDict):
    id: int
    name: str


async def get_listeners_dict(cursor: RainwaveCursor, sid: int) -> list[AllListenersRow]:
    return await cursor.fetch_all(
        """
            SELECT
                r4_listeners.user_id AS id,
                COALESCE(radio_username, username) AS name
            FROM r4_listeners
            JOIN phpbb_users USING (user_id)
            WHERE r4_listeners.sid = %s
                AND r4_listeners.user_id > 1
            ORDER BY COALESCE(radio_username, username)
""",
        (sid,),
        row_type=AllListenersRow,
    )
