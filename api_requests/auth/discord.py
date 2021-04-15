import asyncio
import uuid

import aiohttp
from api.urls import handle_url
from api.web import HTMLRequest
from libs import config, db, log
from tornado.auth import OAuth2Mixin

from .errors import OAuthNetworkError, OAuthRejectedError
from .r4_mixin import R4SetupSessionMixin

# use state in a secure cookie: https://discord.com/developers/docs/topics/oauth2#state-and-security
# remove old fields from user
# add discord bot to react to role changes/logins
# need account merging because people don't know they're logged in

DEFAULT_TIMEOUT = aiohttp.ClientTimeout(total=2)

REDIRECT_URI = config.get("base_site_url") + "oauth/discord"

@handle_url("/oauth/discord")
class DiscordAuth(HTMLRequest, OAuth2Mixin, R4SetupSessionMixin):
    auth_required = False
    sid_required = False

    _OAUTH_AUTHORIZE_URL = "https://discord.com/api/oauth2/authorize"
    _OAUTH_ACCESS_TOKEN_URL = "https://discord.com/api/oauth2/token"

    async def get(self):
        if self.get_argument("code", False):
            # step 2 - we've come back from Discord with a unique auth code, get
            # token that we can use to act on behalf of user with discord
            token = await self.get_token(self.get_argument("code"))
            # step 3 - get user info from Discord and login to Rainwave
            await self.register_and_login(token)
        else:
            # step 1 - go to Discord login page
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
                    self._OAUTH_ACCESS_TOKEN_URL, data=data
                ) as response:
                    response_json = await response.json()
                    if response.status != 200:
                        raise OAuthRejectedError(response_json)
                    return response_json["token_type"] + " " + response_json["access_token"]
        except aiohttp.ClientConnectionError:
            raise OAuthNetworkError()

    def get_user_id_by_discord_user_id(self, discord_user_id: str):
        return db.c.fetch_var(
            "SELECT user_id FROM phpbb_users WHERE discord_user_id = %s",
            (discord_user_id,),
        ) or 1

    async def oauth2_request(
        self,
        url,
        access_token,
        data = None,
        **args
    ):
        async with aiohttp.ClientSession(
            headers={"authorization": access_token},
            loop=asyncio.get_running_loop(),
            timeout=DEFAULT_TIMEOUT,
        ) as session:
            async with session.get(
                url, data=data, **args
            ) as response:
                if response.status != 200:
                    raise OAuthRejectedError()
                return await response.json()

    async def register_and_login(self, token: str):
        discord_user = await self.oauth2_request(
            "https://discord.com/api/users/@me", access_token=token
        )

        radio_username = discord_user['username']
        discord_user_id = discord_user['id']
        user_avatar = f"https://cdn.discordapp.com/avatars/{discord_user_id}/{discord_user['avatar']}.jpg?size=320"
        user_avatar_type = "avatar.driver.remote"
        user_id = 1
        username = str(uuid.uuid4())
        if self.user.id > 1:
            user_id = self.user.id
            radio_username = self.user.data['name']
            username = self.user.data['name']
            log.debug("discord", f"Connected legacy phpBB {user_id} to Discord {discord_user_id}")
        else:
            user_id = self.get_user_id_by_discord_user_id(discord_user_id)
            if user_id > 1:
                log.debug("discord", f"Connected linked phpBB {user_id} to Discord {discord_user_id}")
            else:
                log.debug("discord", f"Could not find existing user for Discord {discord_user_id}")

        if user_id > 1:
            log.info("discord", f"Updating exising user {user_id} from Discord {discord_user_id}")
            db.c.update(
                (
                    "UPDATE phpbb_users SET "
                    "  discord_user_id = %s, "
                    "  radio_username = %s, "
                    "  user_avatar_type = %s, "
                    "  user_avatar = %s "
                    # "  user_password = '' "
                    "WHERE user_id = %s"
                ),
                (
                    discord_user_id,
                    radio_username,
                    user_avatar_type,
                    user_avatar,
                    user_id,
                ),
            )
        else:
            log.debug("discord", f"Creating new user from Discord {discord_user_id}")
            db.c.update(
                (
                    "INSERT INTO phpbb_users "
                    "  (username, discord_user_id, radio_username, user_avatar_type, user_avatar) "
                    "  VALUES "
                    "  (%s      , %s             , %s            , %s              , %s)"
                ),
                (
                    username,
                    discord_user_id,
                    radio_username,
                    user_avatar_type,
                    user_avatar,
                ),
            )
            user_id = self.get_user_id_by_discord_user_id(discord_user_id)
            log.info("discord", f"Created new user {user_id} from Discord {discord_user_id}")

        self.setup_rainwave_session(user_id)

        self.redirect("/")

