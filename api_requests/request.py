from api import fieldtypes
from api.exceptions import APIException
from api.urls import handle_api_html_url, handle_api_url
from api.web import APIHandler, PrettyPrintAPIMixin
from libs import cache, db


@handle_api_url("request")
class SubmitRequest(APIHandler):
    sid_required = True
    tunein_required = False
    unlocked_listener_only = False
    description = "Submits a request for a song."
    fields = {"song_id": (fieldtypes.song_id_matching_sid, True)}
    sync_across_sessions = True

    def post(self):
        if self.user.is_anonymous():
            raise APIException("must_login_and_tune_in_to_request")
        if self.user.add_request(self.sid, self.get_argument("song_id")):
            self.append_standard("request_success")
            self.append("requests", self.user.get_requests(self.sid))
        else:
            raise APIException("request_failed")


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
            db.c.update(
                "UPDATE r4_request_store SET reqstor_order = %s WHERE user_id = %s AND song_id = %s",
                (order, self.user.id, song_id),
            )
            order = order + 1
        self.append_standard("requests_reordered")
        self.append("requests", self.user.get_requests(self.sid))


@handle_api_url("request_unrated_songs")
class RequestUnratedSongs(APIHandler):
    description = "Fills the user's request queue with unrated songs."
    login_required = True
    tunein_required = False
    unlocked_listener_only = False
    fields = {"limit": (fieldtypes.integer, False)}
    sync_across_sessions = True

    def post(self):
        if self.user.add_unrated_requests(self.sid, self.get_argument("limit")) > 0:
            self.append_standard("request_unrated_songs_success")
            self.append("requests", self.user.get_requests(self.sid))
        else:
            raise APIException("request_unrated_failed")


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


@handle_api_url("pause_request_queue")
class PauseRequestQueue(APIHandler):
    description = "Stops the user from having their request queue processed while they're listening.  Will remove them from the line."
    login_required = True
    tunein_required = False
    unlocked_listener_only = False
    sync_across_sessions = True

    def post(self):
        self.user.pause_requests()
        self.append("user", self.user.to_private_dict())
        if self.user.data["requests_paused"]:
            self.append_standard("request_queue_paused")
        else:
            self.append_standard("request_queue_unpaused")


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


@handle_api_url("request_line")
class ListRequestLine(APIHandler):
    description = "Gives a list of who is waiting in line to make a request on the given station, plus their current top-requested song. (or no song, if they have not decided)"
    sid_required = True

    def post(self):
        self.append(self.return_name, cache.get_station(self.sid, "request_line"))
        # self.append("request_line_db", db.c.fetch_all("SELECT username, r4_request_line.* FROM r4_request_line JOIN phpbb_users USING (user_id) WHERE sid = %s ORDER BY line_wait_start", (self.sid,)))


@handle_api_html_url("request_line")
class ListRequestLineHTML(PrettyPrintAPIMixin, ListRequestLine):
    pass
