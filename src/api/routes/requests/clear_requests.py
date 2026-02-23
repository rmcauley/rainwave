@handle_api_url("clear_requests")
class ClearRequests(APIHandler):
    description = "Clears all requests from the user's queue."
    login_required = True
    tunein_required = False
    unlocked_listener_only = False
    sync_across_sessions = True

    def post(self):
        self.user.clear_all_requests()
        self.append("requests", self.user.get_requests(self.sid))
