from common.db.cursor import RainwaveCursor


from .model.registered_user import RegisteredUser


async def get_authorized_registered_user(
    cursor: RainwaveCursor, sid: int, user_id: int, api_key: str
) -> RegisteredUser:
    (public_data, private_data, server_data) = await RegisteredUser.get_refreshed_data(
        cursor, sid, user_id, api_key
    )
    return RegisteredUser(public_data, private_data, server_data)
