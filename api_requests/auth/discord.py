import asyncio
import urllib.parse
import uuid

import aiohttp
from api.urls import handle_url
from api.web import HTMLRequest
from libs import config, db
from tornado.auth import OAuth2Mixin

from .errors import OAuthNetworkError, OAuthRejectedError

# use state in a secure cookie: https://discord.com/developers/docs/topics/oauth2#state-and-security
# update api.web to read secure cookie
# remove old fields from user
# add discord bot to react to role changes/logins

DEFAULT_TIMEOUT = aiohttp.ClientTimeout(total=2)


REDIRECT_URI = urllib.parse.urlunsplit(
    (
        "https" if config.get("enforce_ssl") else "http",
        config.get("hostname"),
        "/oauth/discord",
    )
)


@handle_url("/oauth/discord")
class DiscordAuth(HTMLRequest, OAuth2Mixin):
    _OAUTH_AUTHORIZE_URL = "https://discord.com/api/oauth2/authorize"
    _OAUTH_ACCESS_TOKEN_URL = "https://discord.com/api/oauth2/token"

    async def get(self):
        if self.get_argument("code", False):
            token = await self.get_token(self.get_argument("code"))
            await self.register_and_login(token)
        else:
            self.authorize_redirect(
                redirect_uri=REDIRECT_URI,
                client_id=config.get("discord_client_id"),
                scope=["identify"],
                response_type="code",
                extra_params={"prompt": "none",},
            )

    async def get_token(self, code: str):
        data = {
            "client_id": config.get("discord_client_id"),
            "client_secret": config.get("discord_client_secret"),
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
            "scope": "identify",
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        try:
            async with aiohttp.ClientSession(
                headers=headers,
                loop=asyncio.get_running_loop(),
                timeout=DEFAULT_TIMEOUT,
            ) as session:
                async with session.post(
                    "http://discord.com/api/users/@me", data=data
                ) as response:
                    if response.status != 200:
                        raise OAuthRejectedError()
                    return (await response.json())["access_token"]
        except aiohttp.ClientConnectionError:
            raise OAuthNetworkError()

    def get_user_by_discord_user_id(self, discord_user_id: str):
        return db.c.fetch_row(
            "SELECT user_id, user_password, username FROM phpbb_users WHERE discord_user_id = %s",
            (discord_user_id,),
        )

    async def register_and_login(self, token: str):
        discord_user = await self.oauth2_request(
            "https://discord.com/api/users/@me", access_token=token
        )
        user = self.get_user_by_discord_user_id(discord_user["id"]) or {}
        mapped_user_data = {
            "discord_user_id": discord_user["id"],
            "radio_username": discord_user["username"],
            "username": user.get("username", str(uuid.uuid4())),
            "user_avatar_type": "avatar.driver.remote",
            "user_avatar": f"https://cdn.discordapp.com/avatars/{discord_user['user_id']}/{discord_user['avatar_hash']}.jpg?size=320",
        }
        if user.get("user_id"):
            db.c.update(
                (
                    "UPDATE phpbb_users SET "
                    "  radio_username = %(radio_username), "
                    "  user_avatar_type = %(user_avatar_type), "
                    "  user_avatar = %(user_avatar) "
                    "WHERE user_id = %(user_id)"
                ),
                mapped_user_data,
            )
        else:
            db.c.update(
                (
                    "INSERT INTO phpbb_users "
                    "  (username   , discord_user_id   , radio_username   , user_avatar_type   , user_avatar) "
                    "  VALUES "
                    "  (%(username), %(discord_user_id), %(radio_username), %(user_avatar_type), %(user_avatar))"
                ),
                mapped_user_data,
            )
            user = self.get_user_by_discord_user_id(discord_user["id"])

        session_id = str(uuid.uuid4())
        db.c.update(
            "INSERT INTO r4_sessions (session_id, user_id) VALUES (%(session_id), %(user_id))",
            {"session_id": session_id, "user_id": user["user_id"]},
        )
        self.set_secure_cookie("r4_session_id", session_id)

        self.redirect("/")

