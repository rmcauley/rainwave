@handle_api_url("order_requests")
class OrderRequests(APIHandler):
    description = "Change the order of requests in the user's queue.  Submit a comma-separated list of Song IDs, in desired order."
    login_required = True
    tunein_required = False
    unlocked_listener_only = False
    fields = {"order": (fieldtypes.song_id_list, True)}
    sync_across_sessions = True

    def post(self):
        order = 0
        for song_id in self.get_argument_required("order"):
            await cursor.update(
                "UPDATE r4_request_store SET reqstor_order = %s WHERE user_id = %s AND song_id = %s",
                (order, self.user.id, song_id),
            )
            order = order + 1
        self.append_standard("requests_reordered")
        self.append("requests", self.user.get_requests(self.sid))
