@handle_api_url("admin/change_producer_name")
class ChangeProducerName(APIHandler):
    admin_required = True
    sid_required = False
    fields = {
        "sched_id": (fieldtypes.sched_id, True),
        "name": (fieldtypes.string, True),
    }

    def post(self):
        producer = BaseProducer.load_producer_by_id(self.get_argument("sched_id"))
        if not producer:
            raise APIException(
                "internal_error",
                "Producer ID %s not found." % self.get_argument("sched_id"),
            )
        await cursor.update(
            "UPDATE r4_schedule SET sched_name = %s WHERE sched_id = %s",
            (self.get_argument("name"), self.get_argument("sched_id")),
        )
        self.append_standard(
            "success", "Producer name changed to '%s'." % self.get_argument("name")
        )
