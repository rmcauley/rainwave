def unlock_listeners(sid: int) -> None:
    db.c.update(
        "UPDATE r4_listeners SET listener_lock_counter = listener_lock_counter - 1 WHERE listener_lock = TRUE AND listener_lock_sid = %s",
        (sid,),
    )
    db.c.update(
        "UPDATE r4_listeners SET listener_lock = FALSE WHERE listener_lock_counter <= 0"
    )
