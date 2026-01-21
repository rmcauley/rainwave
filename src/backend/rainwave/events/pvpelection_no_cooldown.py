from rainwave.events import election
from rainwave.events import event
from rainwave import request


@event.register_producer
class PVPElectionNoCooldownProducer(election.ElectionProducer):
    always_return_elec = True

    def __init__(self, sid):
        super(PVPElectionNoCooldownProducer, self).__init__(sid)
        self.elec_type = "PVPElectionNoCooldown"
        self.elec_class = PVPElectionNoCooldown

    def has_next_event(self):
        return True


class PVPElectionNoCooldown(election.Election):
    def __init__(self, sid=None):
        super(PVPElectionNoCooldown, self).__init__(sid)
        self._num_requests = 2
        self._num_songs = 2

    def is_request_needed(self):
        election.force_request(self.sid)
        return super(PVPElectionNoCooldown, self).is_request_needed()

    def _get_request_song(self):
        return request.get_next_ignoring_cooldowns(self.sid)
