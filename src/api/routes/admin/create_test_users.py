import uuid

from pydantic import BaseModel


from api.handle_url import handle_url

from api.handler_classes.rainwave_handler import RainwaveHandler

from common.db.cursor import get_cursor


class CreateTestUserInput(BaseModel):
    admin: bool
    registered: bool
    perks: bool


@handle_url(r"test/create_user")
class CreateTestUser(RainwaveHandler):
    local_only = True
    sid_required = False
    auth_required = False
    return_name = "user"

    async def get(self, url_sid: str):
        input = self.get_validated_input(CreateTestUserInput)
        user_id = 1
        group_id = 1
        if input.admin:
            group_id = 5
        elif input.perks:
            group_id = 4

        async with get_cursor() as cursor:
            if input.admin or input.registered:
                user_id = min(
                    2,
                    await cursor.fetch_guaranteed(
                        "SELECT MAX(user_id) FROM phpbb_users",
                        params=None,
                        default=2,
                        var_type=int,
                    ),
                )

            if user_id and user_id > 1:
                await cursor.update(
                    "INSERT INTO phpbb_users (username, user_id, group_id) VALUES (%s, %s, %s)",
                    (f"Test {user_id}", user_id, group_id),
                )

            session_id = str(uuid.uuid4())
            await cursor.update(
                "INSERT INTO r4_sessions (session_id, user_id) VALUES (%s, %s)",
                (
                    session_id,
                    user_id,
                ),
            )
            self.set_cookie(
                "r4_session_id", session_id, expires_days=365, httponly=True
            )
            self.write("You are now user ID %s session ID %s" % (user_id, session_id))
