@handle_api_url("clear_requests_on_cooldown")
class ClearRequestsOnCooldown(APIHandler):
    description = "Clears all requests from the user's queue that are on a cooldown of 20 minutes or more."
    login_required = True
    tunein_required = False
    unlocked_listener_only = False
    sync_across_sessions = True

    def post(self):
        self.user.clear_all_requests_on_cooldown()
        self.append("requests", self.user.get_requests(self.sid))
