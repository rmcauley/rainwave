async def get_registered_listener_record():
    listener = db.c.fetch_row(
        "SELECT "
        "listener_id, sid, listener_lock AS lock, listener_lock_sid AS lock_sid, listener_lock_counter AS lock_counter, listener_voted_entry AS voted_entry "
        "FROM r4_listeners "
        "WHERE user_id = %s AND listener_purge = FALSE",
        (self.id,),
    )


async def get_anonymous_listener_record():
    listener = db.c.fetch_row(
        "SELECT "
        "listener_id, sid, listener_lock AS lock, listener_lock_sid AS lock_sid, listener_lock_counter AS lock_counter, listener_voted_entry AS voted_entry, listener_key AS listen_key "
        "FROM r4_listeners "
        "WHERE listener_ip = %s AND listener_purge = FALSE AND user_id = 1",
        (self.ip_address,),
    )
