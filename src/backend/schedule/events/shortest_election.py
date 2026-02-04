from src.backend.rainwave.events import election
from src.backend.rainwave.events import event
from src.backend.rainwave import playlist


@event.register_producer
class ShortestElectionProducer(election.ElectionProducer):
    def __init__(self, sid: int) -> None:
        super().__init__(sid)
        self.elec_type = "ShortestElection"
        self.elec_class = ShortestElection


class ShortestElection(election.Election):
    def _fill_get_song(self, target_song_length: int | None) -> playlist.Song:
        return playlist.get_shortest_song(self.sid)
