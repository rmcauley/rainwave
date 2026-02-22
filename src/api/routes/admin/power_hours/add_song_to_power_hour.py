@handle_api_url("admin/add_song_to_power_hour")
class AddSongToPowerHour(api.web.APIHandler):
    return_name = "power_hour"
    admin_required = True
    sid_required = True
    allow_sid_zero = True
    fields = {
        "sched_id": (fieldtypes.sched_id, True),
        "song_id": (fieldtypes.song_id, True),
        "song_sid": (fieldtypes.sid, True),
    }

    def post(self):
        ph = OneUpProducer.load_producer_by_id(self.get_argument("sched_id"))
        if not ph:
            raise APIException("404", http_code=404)
        ph.add_song_id(self.get_argument("song_id"), self.get_argument("song_sid"))
        self.append(self.return_name, ph.to_dict())
