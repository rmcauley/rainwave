from typing import TypedDict

from common.db.cursor import RainwaveCursor


class ListenerRecord(TypedDict):
    listener_id: int
    sid: int
    lock: bool
    lock_sid: int
    lock_counter: int
    voted_entry: int
    listen_key: str | None


async def get_registered_listener_record(
    cursor: RainwaveCursor, user_id: int
) -> ListenerRecord | None:
    return await cursor.fetch_row(
        """
        SELECT 
            listener_id, 
            sid, 
            listener_lock AS lock, 
            listener_lock_sid AS lock_sid, 
            listener_lock_counter AS lock_counter, 
            listener_voted_entry AS voted_entry 
            NULL AS listen_key
        FROM r4_listeners 
        WHERE user_id = %s AND listener_purge = FALSE
""",
        (user_id,),
        row_type=ListenerRecord,
    )


async def get_anonymous_listener_record(
    cursor: RainwaveCursor, ip_address: str
) -> ListenerRecord | None:
    return await cursor.fetch_row(
        """
        SELECT 
            listener_id, 
            sid, 
            listener_lock AS lock, 
            listener_lock_sid AS lock_sid, 
            listener_lock_counter AS lock_counter, 
            listener_voted_entry AS voted_entry 
            listener_key AS listen_key
        FROM r4_listeners 
        WHERE listener_ip = %s AND listener_purge = FALSE AND user_id = 1
""",
        (ip_address,),
        row_type=ListenerRecord,
    )
