def trim_listeners(sid: int) -> None:
    db.c.update(
        "DELETE FROM r4_listeners WHERE sid = %s AND listener_purge = TRUE", (sid,)
    )
