class OneUp(event.BaseEvent):
    @classmethod
    def load_by_id(cls, one_up_id: int, sid: int) -> "OneUp":
        row = await cursor.fetch_row(
            "SELECT * FROM r4_one_ups WHERE one_up_id = %s", (one_up_id,)
        )
        if not row:
            raise Exception("OneUp schedule ID %s not found." % one_up_id)
        one_up = cls()
        one_up.id = row["one_up_id"]
        one_up.used = row["one_up_used"]
        one_up.songs = [playlist.Song.load_from_id(row["song_id"], row["one_up_sid"])]
        one_up.sid = sid
        return one_up

    def start_event(self) -> None:
        super().start_event()
        self.songs[0].start_election_block(
            self.sid, config.get_station(self.sid, "num_planned_elections") + 1
        )

    def finish(self) -> None:
        super().finish()
        await cursor.update(
            "UPDATE r4_one_ups SET one_up_used = TRUE WHERE one_up_id = %s", (self.id,)
        )

    def delete(self) -> int:
        return await cursor.update(
            "DELETE FROM r4_one_ups WHERE one_up_id = %s", (self.id,)
        )
