from libs import db


def get_listeners_dict(sid):
    return db.c.fetch_all(
        "SELECT r4_listeners.user_id AS id, username AS name FROM r4_listeners JOIN phpbb_users USING (user_id) "
        "WHERE r4_listeners.sid = %s AND r4_listeners.user_id > 1 "
        "ORDER BY username",
        (sid,),
    )
