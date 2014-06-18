from rainwave.events import election
from rainwave.events import event

@event.register_producer
class PVPElectionProducer(election.ElectionProducer):
	def __init__(self, sid):
		super(PVPElectionProducer, self).__init__(sid)
		self.elec_type = "PVPElection"
		self.elec_class = PVPElection

class PVPElection(election.Election):
	def __init__(self, sid = None):
		super(PVPElection, self).__init__(sid)
		self._num_requests = 2
		self._num_songs = 2

	def is_request_needed(self):
		election.force_request(self.sid)
		return super(PVPElection, self).is_request_needed()
