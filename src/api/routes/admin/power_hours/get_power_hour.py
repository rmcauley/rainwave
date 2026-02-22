@handle_api_url("admin/get_power_hour")
class GetPowerHour(api.web.APIHandler):
    return_name = "power_hour"
    admin_required = True
    sid_required = True
    fields = {"sched_id": (fieldtypes.sched_id, True)}

    def post(self):
        ph = OneUpProducer.load_producer_by_id(self.get_argument("sched_id"))
        if ph:
            self.append(self.return_name, ph.to_dict())
        else:
            self.append(self.return_name, None)
