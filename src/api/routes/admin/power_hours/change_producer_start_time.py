@handle_api_url("admin/change_producer_start_time")
class ChangeProducerStartTime(api.web.APIHandler):
    return_name = "producer"
    admin_required = True
    sid_required = True
    fields = {
        "sched_id": (fieldtypes.sched_id, True),
        "utc_time": (fieldtypes.positive_integer, True),
    }

    def post(self):
        producer = BaseProducer.load_producer_by_id(self.get_argument("sched_id"))
        if not producer:
            raise APIException("404", http_code=404)
        producer.change_start(self.get_argument("utc_time"))
        self.append(self.return_name, producer.to_dict())
