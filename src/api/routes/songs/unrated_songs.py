@handle_api_url("unrated_songs")
class UnratedSongsHandler(APIHandler):
    description = "Get all of a user's unrated songs."
    return_name = "unrated_songs"
    login_required = True
    pagination = True

    def post(self):
        self.append(
            self.return_name,
            playlist.get_unrated_songs_for_user(
                self.user.id, self.get_sql_limit_string()
            ),
        )


@handle_api_html_url("unrated_songs")
class UnratedSongsHTML(PrettyPrintAPIMixin, UnratedSongsHandler):
    pass
