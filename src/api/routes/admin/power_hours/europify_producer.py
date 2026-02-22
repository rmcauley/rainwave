@handle_api_url("admin/europify_producer")
class EuropifyProducer(api.web.APIHandler):
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
        new_producer.name += " Reprisal"
        start_eu = datetime.fromtimestamp(producer.start, timezone("UTC")).replace(
            tzinfo=timezone("Europe/London")
        ).replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=1)
        start_epoch_eu = int(
            (start_eu - datetime.fromtimestamp(0, timezone("UTC"))).total_seconds()
        )
        new_producer.change_start(start_epoch_eu)
        await cursor.update(
            "UPDATE r4_schedule SET sched_name = %s WHERE sched_id = %s",
            (new_producer.name, new_producer.id),
        )
        self.append(self.return_name, new_producer.to_dict())
