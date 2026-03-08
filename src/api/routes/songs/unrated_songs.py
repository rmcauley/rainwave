from api.handle_url import handle_api_html_url, handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.helpers.paginated_requests import get_pagination_params
from common.rainwave import playlist


@handle_api_url("unrated_songs")
class UnratedSongsHandler(APIHandler):
    description = "Get all of a user's unrated songs."
    return_name = "unrated_songs"
    login_required = True
    pagination = True

    async def post(self):
        limit, _ = get_pagination_params(self)
        self.response["unrated_songs"] = playlist.get_unrated_songs_for_user(
            self.user.id, limit
        ),
        self.write_rainwave_output()


@handle_api_html_url("unrated_songs")
class UnratedSongsHTML(UnratedSongsHandler):
    pretty_print_html = True
