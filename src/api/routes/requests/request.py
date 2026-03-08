from api import fieldtypes
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler


@handle_api_url("request")
class SubmitRequest(APIHandler):
    sid_required = True
    tunein_required = False
    unlocked_listener_only = False
    description = "Submits a request for a song."
    fields = {"song_id": (fieldtypes.song_id_matching_sid, True)}
    sync_across_sessions = True

    async def post(self):
        if self.user.is_anonymous():
            raise APIException("must_login_and_tune_in_to_request")
        if self.user.add_request(self.sid, input.song_id):
            self.append_standard("request_success")
            self.response["requests"] = self.user.get_requests(self.sid)
        else:
            raise APIException("request_failed")
