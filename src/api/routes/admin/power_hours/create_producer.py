@handle_api_url("admin/create_producer")
class CreateProducer(api.web.APIHandler):
    return_name = "power_hour"
    admin_required = True
    sid_required = True
    fields = {
        "producer_type": (fieldtypes.producer_type, True),
        "name": (fieldtypes.string, True),
        "start_utc_time": (fieldtypes.positive_integer, True),
        "end_utc_time": (fieldtypes.positive_integer, True),
        "url": (fieldtypes.string, None),
        "fill_unrated": (fieldtypes.boolean, False),
    }

    def post(self):
        p = event.all_producers[self.get_argument("producer_type")].create(
            sid=self.sid,
            start=self.get_argument("start_utc_time"),
            end=self.get_argument("end_utc_time"),
            name=self.get_argument("name"),
            url=self.get_argument("url"),
        )
        if self.get_argument("fill_unrated") and getattr(p, "fill_unrated", False):
            end_time = self.get_argument_int("end_utc_time")
            start_time = self.get_argument_int("start_utc_time")
            if not end_time or not start_time:
                raise APIException(400, http_code=400)
            p.fill_unrated(
                self.sid,
                end_time - start_time,
            )
        self.append(self.return_name, p.to_dict())
