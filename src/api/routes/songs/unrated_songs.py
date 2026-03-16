from api.handle_url import handle_api_html_url, handle_api_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from api.helpers.paginated_requests import get_pagination_params
from common.db.cursor import get_cursor
from common.user.get_unrated_songs_for_user import get_unrated_songs_for_user

@handle_api_url("unrated_songs")
class UnratedSongsHandler(RegisteredUserAPIHandler):
    description = "Get all of a user's unrated songs."

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "unrated_songs"
    login_required = True
    pagination = True

    async def post(self):
        limit, _ = get_pagination_params(self)
        async with get_cursor() as cursor:
            self.response["unrated_songs"] = await get_unrated_songs_for_user(
                cursor, self.user.id, limit
            )

@handle_api_html_url("unrated_songs")
class UnratedSongsHTML(UnratedSongsHandler):
    pretty_print_html = True
