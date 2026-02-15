class PVPElectionProducer(election.ElectionProducer):
    always_return_elec = True

    def __init__(self, sid: int) -> None:
        super().__init__(sid)
        self.elec_type = "PVPElection"
        self.elec_class = PVPElection

    def has_next_event(self) -> bool:
        return True
