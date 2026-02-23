@handle_api_url("unpause_request_queue")
class UnPauseRequestQueue(APIHandler):
    description = "Allows the user's request queue to continue being processed.  Adds the user back to the request line."
    login_required = True
    tunein_required = False
    unlocked_listener_only = False
    sync_across_sessions = True

    def post(self):
        self.user.unpause_requests(self.sid)
        self.append("user", self.user.to_private_dict())
        if self.user.data["requests_paused"]:
            self.append_standard("request_queue_paused")
        else:
            self.append_standard("request_queue_unpaused")
