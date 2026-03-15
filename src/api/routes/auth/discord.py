from api.exceptions import APIException
import asyncio
import uuid
import secrets
import bcrypt

import aiohttp
from api.handle_url import handle_url

from tornado.auth import OAuth2Mixin

from api.routes.auth.oauth_handler import OAuthHandler
from common import config, log

from .errors import OAuthNetworkError, OAuthRejectedError
from common.db.cursor import get_cursor

# add discord bot to react to role changes/logins
# need account merging because people don't know they're logged in

DEFAULT_TIMEOUT = aiohttp.ClientTimeout(total=10)

REDIRECT_URI = config.base_site_url + "oauth/discord"
OAUTH_STATE_SALT = bcrypt.gensalt()


@handle_url("/oauth/discord")
class DiscordAuth(OAuthHandler, OAuth2Mixin):
    auth_required = False
    sid_required = False

    _OAUTH_AUTHORIZE_URL = "https://discord.com/api/oauth2/authorize"
    _OAUTH_ACCESS_TOKEN_URL = "https://discord.com/api/oauth2/token"

    async def get(self):
        if not self.get_argument("id"):
            # step 1 - redirect to Discord login page
            destination = self.get_destination()
            if not destination:
                raise APIException(
                    "missing_argument", "No destination for OAuth2.", 400
                )
            oauth_secret = secrets.token_hex()
            self.set_cookie("r4_oauth_secret", oauth_secret)
            oauth_state = (
                destination
                + "$"
                + bcrypt.hashpw(oauth_secret.encode(), OAUTH_STATE_SALT).decode("utf-8")
            )
            self.authorize_redirect(
                redirect_uri=REDIRECT_URI,
                client_id=config.discord_client_id,
                scope=["identify"],
                response_type="code",
                extra_params={"prompt": "none", "state": oauth_state},
            )
        else:
            # step 2 - we've come back from Discord with a state parameter
            # that needs to be verified against the user's cookie.
            oauth_secret = self.get_cookie("r4_oauth_secret")
            if not oauth_secret:
                raise OAuthRejectedError(
                    "OAuth 1st party cookie not found - have you disabled cookies for Rainwave?  1st party cookies are required for Discord login to work on Rainwave."
                )
            oauth_expected_state = bcrypt.hashpw(
                oauth_secret.encode(), OAUTH_STATE_SALT
            ).decode("utf-8")
            self.set_cookie("r4_oauth_secret", "")
            state_argument = self.get_argument("state_argument")
            if not state_argument:
                raise OAuthRejectedError(
                    "State argument was not passed back to Rainwave from Discord."
                )
            destination, oauth_state = state_argument.split("$", maxsplit=1)
            if oauth_expected_state != oauth_state:
                raise OAuthRejectedError("oAuth State Mismatch")
            # step 3 - we've come back from Discord with a unique auth code, get
            # token that we can use to act on behalf of user with discord
            token_argument = self.get_argument("token")
            if not token_argument:
                raise OAuthRejectedError(
                    "Token argument was not passed back to Rainwave from Discord."
                )
            token = await self.get_token(token_argument)
            # step 4 - get user info from Discord and login to Rainwave
            await self.register_and_login(token, destination)

    async def get_token(self, code: str):
        data = {
            "client_id": config.discord_client_id,
            "client_secret": config.discord_client_secret,
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
                    return (
                        response_json["token_type"]
                        + " "
                        + response_json["access_token"]
                    )
        except aiohttp.ClientConnectionError:
            raise OAuthNetworkError()

    async def register_and_login(self, token: str, destination: str):
        async with get_cursor() as cursor:
            discord_user = await self.oauth2_request(
                "https://discord.com/api/users/@me", access_token=token
            )

            radio_username = discord_user["username"]
            discord_user_id = discord_user["id"]
            user_avatar = f"https://cdn.discordapp.com/avatars/{discord_user_id}/{discord_user['avatar']}.png?size=320"
            user_avatar_type = "avatar.driver.remote"
            user_id = 1
            username = str(uuid.uuid4())

            potential_user_id = await cursor.fetch_guaranteed(
                "SELECT user_id FROM phpbb_users WHERE discord_user_id = %s ORDER BY user_id ASC",
                (discord_user_id,),
                var_type=int,
                default=0,
            )

            if self.optional_user and not self.optional_user.is_anonymous():
                if potential_user_id > 1 and potential_user_id != self.optional_user.id:
                    await cursor.update(
                        "UPDATE phpbb_users SET discord_user_id = '' WHERE discord_user_id = %s",
                        (discord_user_id,),
                    )
                user_id = self.optional_user.id
                radio_username = self.optional_user.public_data["name"]
                username = self.optional_user.public_data["name"]
                log.debug(
                    "discord",
                    f"Connected legacy phpBB {user_id} to Discord {discord_user_id}",
                )
            else:
                user_id = potential_user_id
                if user_id > 1:
                    log.debug(
                        "discord",
                        f"Connected linked phpBB {user_id} to Discord {discord_user_id}",
                    )
                else:
                    log.debug(
                        "discord",
                        f"Could not find existing user for Discord {discord_user_id}",
                    )

            if user_id > 1:
                log.info(
                    "discord",
                    f"Updating exising user {user_id} from Discord {discord_user_id}",
                )
                await cursor.update(
                    (
                        """
                        UPDATE phpbb_users
                        SET discord_user_id = %s,
                            radio_username = %s,
                            user_avatar_type = %s,
                            user_avatar = %s,
                            user_password = '',
                            user_email = '',
                            user_email_hash = 0
                        WHERE user_id = %s
                        """
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
                log.debug(
                    "discord", f"Creating new user from Discord {discord_user_id}"
                )
                user_id = await cursor.fetch_guaranteed(
                    (
                        """
                        INSERT INTO phpbb_users (
                            username,
                            username_clean,
                            discord_user_id,
                            radio_username,
                            user_avatar_type,
                            user_avatar
                        )
                        VALUES (%s , %s, %s , %s , %s , %s)
                        RETURNING user_id
                        """
                    ),
                    (
                        username,
                        username,
                        discord_user_id,
                        radio_username,
                        user_avatar_type,
                        user_avatar,
                    ),
                    var_type=int,
                    default=1,
                )
                log.info(
                    "discord",
                    f"Created new user {user_id} from Discord {discord_user_id}",
                )

        await self.setup_rainwave_session_and_redirect(user_id, destination)
