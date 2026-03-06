from api.handle_url import handle_api_html_url, handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.handler_classes.api_pretty_print_handler import (
    PrettyPrintAPIHandler as PrettyPrintAPIMixin,
)
from common.rainwave import playlist


@handle_api_url("unrated_songs")
class UnratedSongsHandler(APIHandler):
    description = "Get all of a user's unrated songs."
    return_name = "unrated_songs"
    login_required = True
    pagination = True

    async def post(self):
                self.response[self.return_name] = playlist.get_unrated_songs_for_user(
                self.user.id, self.get_sql_limit_string()
            ),
        self.write_rainwave_output()


@handle_api_html_url("unrated_songs")
class UnratedSongsHTML(PrettyPrintAPIMixin, UnratedSongsHandler):
    pass
