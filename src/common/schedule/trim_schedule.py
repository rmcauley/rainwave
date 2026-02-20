from time import time as timestamp
from common import config
from common.db.cursor import RainwaveCursor, RainwaveCursorTx


async def trim_schedule(cursor: RainwaveCursor | RainwaveCursorTx, sid: int) -> None:
    # Deletes any events in the schedule and elections tables that are old, according to the config
    current_time = int(timestamp())
    await cursor.update(
        "DELETE FROM r4_schedule WHERE sched_start_actual <= %s AND sched_type != 'OneUpProducer'",
        (current_time - config.trim_event_age,),
    )
    await cursor.update(
        "DELETE FROM r4_elections WHERE elec_start_actual <= %s",
        (current_time - config.trim_election_age,),
    )
    max_history_id = await cursor.fetch_guaranteed(
        "SELECT MAX(songhist_id) FROM r4_song_history",
        params=None,
        default=0,
        var_type=int,
    )
    await cursor.update(
        "DELETE FROM r4_song_history WHERE songhist_id <= %s AND sid = %s",
        (max_history_id - config.trim_history_length, sid),
    )
