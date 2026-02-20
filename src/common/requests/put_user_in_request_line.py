from common.db.cursor import RainwaveCursor
from common.requests.remove_user_from_request_line import remove_user_from_request_line
from common.requests.request_line_types import RequestLineSqlRow


async def put_user_in_request_line(
    cursor: RainwaveCursor,
    user_id: int,
    user_requests_paused: bool,
    for_station_sid: int,
    has_available_song: bool,
    existing_line_entry: RequestLineSqlRow | None,
) -> None:
    if user_requests_paused:
        return

    if existing_line_entry and existing_line_entry["line_sid"] == for_station_sid:
        if existing_line_entry["line_expiry_tune_in"]:
            await cursor.update(
                "UPDATE r4_request_line SET line_expiry_tune_in = NULL WHERE user_id = %s",
                (user_id,),
            )
        return

    if existing_line_entry:
        await remove_user_from_request_line(cursor, user_id)

    await cursor.update(
        "INSERT INTO r4_request_line (user_id, sid, line_has_had_valid) VALUES (%s, %s, %s)",
        (user_id, for_station_sid, has_available_song),
    )
