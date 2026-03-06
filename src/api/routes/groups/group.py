from api import fieldtypes
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from common.rainwave import playlist


@handle_api_url("group")
class GroupHandler(APIHandler):
    description = "Get detailed information about a song group."
    return_name = "group"
    fields = {"id": (fieldtypes.group_id, True)}

    async def post(self):
        group = playlist.SongGroup.load_from_id(self.get_argument("id"))
        group.load_songs_from_sid(self.sid, self.user.id)
                self.response[self.return_name] = group.to_dict_full(self.user)
