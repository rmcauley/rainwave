_request_interval = {}
_request_sequence = {}


def force_request(sid: int) -> None:
    global _request_interval
    global _request_sequence
    _request_interval[sid] = 0
    _request_sequence[sid] = 0


@event.register_producer
class ElectionProducer(event.BaseProducer):
    always_return_elec = False

    def __init__(self, sid: int) -> None:
        super().__init__(sid)
        self.plan_ahead_limit = config.get_station(sid, "num_planned_elections")
        self.elec_type = "Election"
        self.elec_class = Election

    def has_next_event(self) -> Any:
        if not self.id:
            return True
        else:
            return await cursor.fetch_var(
                "SELECT elec_id FROM r4_elections WHERE elec_type = %s and elec_used = FALSE AND sid = %s AND elec_used = FALSE AND sched_id = %s",
                (self.elec_type, self.sid, self.id),
            )

    def load_next_event(
        self,
        target_length: int | None = None,
        min_elec_id: int = 0,
        skip_requests: bool = False,
    ) -> Any:
        if self.id:
            elec_id = await cursor.fetch_var(
                "SELECT elec_id FROM r4_elections WHERE elec_type = %s and elec_used = FALSE AND sid = %s AND elec_id > %s AND sched_id = %s ORDER BY elec_id LIMIT 1",
                (self.elec_type, self.sid, min_elec_id, self.id),
            )
        else:
            elec_id = await cursor.fetch_var(
                "SELECT elec_id FROM r4_elections WHERE elec_type = %s and elec_used = FALSE AND sid = %s AND elec_id > %s AND sched_id IS NULL ORDER BY elec_id LIMIT 1",
                (self.elec_type, self.sid, min_elec_id),
            )
        log.debug(
            "load_election",
            "Check for next election (type %s, sid %s, min. ID %s, sched_id %s): %s"
            % (self.elec_type, self.sid, min_elec_id, self.id, elec_id),
        )
        if elec_id:
            elec = self.elec_class.load_by_id(elec_id)
            if not elec.songs:
                log.warn("load_election", "Election ID %s is empty.  Marking as used.")
                await cursor.update(
                    "UPDATE r4_elections SET elec_used = TRUE WHERE elec_id = %s",
                    (elec.id,),
                )
                return self.load_next_event()
            elec.url = self.url
            elec.name = self.name
            return elec
        elif self.id and not self.always_return_elec:
            return None
        else:
            return self._create_election(target_length, skip_requests)

    def load_event_in_progress(self) -> Any:
        if self.id:
            elec_id = await cursor.fetch_var(
                "SELECT elec_id FROM r4_elections WHERE elec_type = %s AND elec_in_progress = TRUE AND sid = %s AND sched_id = %s ORDER BY elec_id DESC LIMIT 1",
                (self.elec_type, self.sid, self.id),
            )
        else:
            elec_id = await cursor.fetch_var(
                "SELECT elec_id FROM r4_elections WHERE elec_type = %s AND elec_in_progress = TRUE AND sid = %s AND sched_id IS NULL ORDER BY elec_id DESC LIMIT 1",
                (self.elec_type, self.sid),
            )
        log.debug(
            "load_election",
            "Check for in-progress elections (type %s, sid %s, sched_id %s): %s"
            % (self.elec_type, self.sid, self.id, elec_id),
        )
        if elec_id:
            elec = self.elec_class.load_by_id(elec_id)
            if not elec.songs:
                log.warn("load_election", "Election ID %s is empty.  Marking as used.")
                await cursor.update(
                    "UPDATE r4_elections SET elec_used = TRUE WHERE elec_id = %s",
                    (elec.id,),
                )
                return self.load_next_event()
            elec.name = self.name
            elec.url = self.url
            return elec
        else:
            return self.load_next_event()

    def _create_election(self, target_length: int | None, skip_requests: bool) -> Any:
        log.debug(
            "create_elec",
            "Creating election type %s for sid %s, target length %s."
            % (self.elec_type, self.sid, target_length),
        )
        await cursor.start_transaction()
        try:
            elec = self.elec_class.create(self.sid, self.id)
            elec.url = self.url
            elec.name = self.name
            elec.fill(target_length, skip_requests)
            if elec.length() == 0:
                raise Exception("Created zero-length election.")
            await cursor.commit()
            return elec
        except:
            await cursor.rollback()
            raise
