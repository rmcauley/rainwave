from api import fieldtypes
from api.handle_url import handle_api_url
from .rate import SubmitRatingRequest


@handle_api_url("clear_rating")
class ClearRating(SubmitRatingRequest):
    description = "Erase a rating."
    fields = {"song_id": (fieldtypes.song_id, True)}

    async def post(self):
        self.clear_rating(input["song_id"))
        self.write_rainwave_output()
