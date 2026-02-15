class PVPElection(election.Election):
    def __init__(self, sid: int | None = None) -> None:
        super().__init__(sid)
        self._num_requests = 2
        self._num_songs = 2

    def is_request_needed(self) -> bool:
        election.force_request(self.sid)
        return super().is_request_needed()
