@handle_api_url("clear_rating")
class ClearRating(SubmitRatingRequest):
    description = "Erase a rating."
    fields = {"song_id": (fieldtypes.song_id, True)}

    def post(self):
        self.clear_rating(self.get_argument("song_id"))
