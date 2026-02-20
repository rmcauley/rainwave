from common.db.cursor import RainwaveCursor
from common.user.model.anonymous_user import AnonymousUser


async def get_authorized_anonymous_user(
    cursor: RainwaveCursor, sid: int, user_id: int, api_key: str
) -> AnonymousUser:
    (public_data, private_data, server_data) = await AnonymousUser.get_refreshed_data(
        cursor, sid, user_id, api_key
    )
    return AnonymousUser(public_data, private_data, server_data)
