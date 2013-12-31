from rainwave.events import election

@event.register_producer
class PVPElectionProducer(election.ElectionProducer):
	elec_type = 'PVPElection'
	elec_class = PVPElection

class PVPElection(election.Election):
	def __init__(self, sid = None):
		super(PVPElection, self).__init__(sid)
		self._num_requests = 2
		self._num_songs = 2

	def is_request_needed(self):
		election._request_sequence[self.sid] = 0
		return True
