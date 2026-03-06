@handle_api_url("admin/remove_from_power_hour")
class RemoveFromPowerHour(APIHandler):
    return_name = "power_hour"
    admin_required = True
    sid_required = True
    fields = {"one_up_id": (fieldtypes.positive_integer, True)}

    def post(self):
        ph_id = await cursor.fetch_var(
            "SELECT sched_id FROM r4_one_ups WHERE one_up_id = %s",
            (self.get_argument("one_up_id"),),
        )
        if not ph_id:
            raise APIException("invalid_argument", "Invalid One Up ID.")
        ph = OneUpProducer.load_producer_by_id(ph_id)
        if not ph:
            raise APIException("404", http_code=404)
        ph.remove_one_up(self.get_argument("one_up_id"))
        self.append(self.return_name, ph.to_dict())
