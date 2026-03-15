from api import rainwave_dto
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from common.cache.timeline_cache import get_timeline_api_cache
from common.cache.update_user_rating_acl import get_user_rating_acl
from common.db.cursor import get_cursor
from common.ratings.set_song_rating import set_song_rating


@handle_api_url("rate")
class SubmitRatingRequest(RegisteredUserAPIHandler):
    sid_required = True
    return_name = "rate_result"
    tunein_required = False
    unlocked_listener_only = False
    description = "Rate a song.  The user must have been tuned in for this song to rate it, or they must be tuned in if it's the currently playing song."
    sync_across_sessions = True

    async def post(self):
        input = self.get_validated_input(rainwave_dto.Api4RatePostRequest)
        async with get_cursor() as cursor:
            song_id = await cursor.fetch_var(
                "SELECT song_id FROM r4_songs WHERE song_id = %s AND song_verified = TRUE",
                (input.song_id,),
                var_type=int,
            )
            if not song_id:
                raise APIException("song_does_not_exist")

            if not self.user.private_data["rate_anything"]:
                acl = await get_user_rating_acl(self.sid)
                timeline_api = await get_timeline_api_cache(self.sid)
                if (
                    not timeline_api
                    or not timeline_api[0]
                    or not timeline_api[0]["sched_current"]
                    or not timeline_api[0]["sched_current"]["songs"][0]["id"] == song_id
                ):
                    if (
                        not acl
                        or not song_id in acl
                        or not self.user.id in acl[song_id]
                    ):
                        raise APIException("cannot_rate_now")
                elif not self.user.is_tunedin():
                    raise APIException("tunein_to_rate_current_song")

            updated_albums = await set_song_rating(
                cursor, self.sid, song_id, self.user.id, float(input.rating)
            )

            self.response["rate_result"] = {
                "rating_user": None,
                "song_id": song_id,
                "success": True,
                "text": self.rainwave_locale.translate("rating_cleared"),
                "tl_key": "rating_cleared",
                "updated_album_ratings": updated_albums,
            }

        self.write_rainwave_output()
