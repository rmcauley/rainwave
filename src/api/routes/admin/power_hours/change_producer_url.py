@handle_api_url("admin/change_producer_url")
class ChangeProducerURL(api.web.APIHandler):
    admin_required = True
    sid_required = False
    fields = {"sched_id": (fieldtypes.sched_id, True), "url": (fieldtypes.string, None)}

    def post(self):
        producer = BaseProducer.load_producer_by_id(self.get_argument("sched_id"))
        if not producer:
            raise APIException(
                "internal_error",
                "Producer ID %s not found." % self.get_argument("sched_id"),
            )
        await cursor.update(
            "UPDATE r4_schedule SET sched_url = %s WHERE sched_id = %s",
            (self.get_argument("url"), self.get_argument("sched_id")),
        )
        if self.get_argument("url"):
            self.append_standard(
                "success", "Producer URL changed to '%s'." % self.get_argument("url")
            )
        else:
            self.append_standard("success", "Producer URL removed.")
