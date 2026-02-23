@handle_api_url("request_favorited_songs")
class RequestFavoritedSongs(APIHandler):
    description = "Fills the user's request queue with favorited songs."
    login_required = True
    tunein_required = False
    unlocked_listener_only = False
    fields = {"limit": (fieldtypes.integer, False)}
    sync_across_sessions = True

    def post(self):
        if self.user.add_favorited_requests(self.sid, self.get_argument("limit")) > 0:
            self.append_standard("request_favorited_songs_success")
            self.append("requests", self.user.get_requests(self.sid))
        else:
            raise APIException("request_favorited_failed")
