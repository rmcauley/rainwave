from libs import db


def get_listeners_dict(sid):
    return db.c.fetch_all(
        "SELECT r4_listeners.user_id AS id, COALESCE(radio_username, username) AS name FROM r4_listeners JOIN phpbb_users USING (user_id) "
        "WHERE r4_listeners.sid = %s AND r4_listeners.user_id > 1 "
        "ORDER BY COALESCE(radio_username, username)",
        (sid,),
    )
