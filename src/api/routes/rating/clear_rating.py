from api import rainwave_dto
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from common.db.cursor import get_cursor
from common.ratings.set_song_rating import set_song_rating


@handle_api_url("clear_rating")
class ClearRating(RegisteredUserAPIHandler):
    sid_required = True
    description = "Erase a rating."
    return_name = "rate_result"
    tunein_required = False
    unlocked_listener_only = False
    sync_across_sessions = True

    async def post(self):
        input = self.get_validated_input(rainwave_dto.Api4ClearRatingPostRequest)
        async with get_cursor() as cursor:
            song_id = await cursor.fetch_var(
                "SELECT song_id FROM r4_songs WHERE song_id = %s AND song_verified = TRUE",
                (input.song_id,),
                var_type=int,
            )
            if not song_id:
                raise APIException("song_does_not_exist")

            updated_albums = await set_song_rating(
                cursor, self.sid, song_id, self.user.id, None
            )

            self.response["rate_result"] = {
                "rating_user": None,
                "song_id": song_id,
                "success": True,
                "text": self.rainwave_locale.translate("rating_cleared"),
                "tl_key": "rating_cleared",
                "updated_album_ratings": updated_albums,
            }
