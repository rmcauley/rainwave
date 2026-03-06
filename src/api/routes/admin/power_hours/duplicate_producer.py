@handle_api_url("admin/duplicate_producer")
class DuplicateProducer(APIHandler):
    return_name = "power_hour"
    admin_required = True
    sid_required = True
    fields = {"sched_id": (fieldtypes.sched_id, True)}

    def post(self):
        producer = BaseProducer.load_producer_by_id(self.get_argument("sched_id"))
        if not producer:
            raise APIException(
                "internal_error",
                "Producer ID %s not found." % self.get_argument("sched_id"),
            )
        new_producer = producer.duplicate()
        self.append(self.return_name, new_producer.to_dict())
