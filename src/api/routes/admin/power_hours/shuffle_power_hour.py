@handle_api_url("admin/shuffle_power_hour")
class ShufflePowerHour(APIHandler):
    return_name = "power_hour"
    admin_required = True
    sid_required = True
    fields = {"sched_id": (fieldtypes.sched_id, True)}

    def post(self):
        ph = OneUpProducer.load_producer_by_id(self.get_argument("sched_id"))
        if not ph:
            raise APIException("404", http_code=404)
        ph.shuffle_songs()
        self.append(self.return_name, ph.to_dict())
