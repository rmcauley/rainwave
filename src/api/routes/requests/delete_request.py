@handle_api_url("delete_request")
class DeleteRequest(APIHandler):
    description = "Removes a request from the user's queue."
    login_required = True
    tunein_required = False
    unlocked_listener_only = False
    fields = {"song_id": (fieldtypes.song_id, True)}
    sync_across_sessions = True

    def post(self):
        if self.user.remove_request(self.get_argument("song_id")):
            self.append_standard("request_deleted")
            self.append("requests", self.user.get_requests(self.sid))
        else:
            raise APIException("request_delete_failed")
