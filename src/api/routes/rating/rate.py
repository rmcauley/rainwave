from api import fieldtypes
from api.handler_classes.api_handler import APIHandler
from api.exceptions import APIException
from api.handle_url import handle_api_url

from libs import cache
from common.rainwave import rating as ratinglib
from common.rainwave import playlist


@handle_api_url("rate")
class SubmitRatingRequest(APIHandler):
    sid_required = True
    return_name = "rate_result"
    login_required = True
    tunein_required = False
    unlocked_listener_only = False
    description = "Rate a song.  The user must have been tuned in for this song to rate it, or they must be tuned in if it's the currently playing song."
    fields = {
        "song_id": (fieldtypes.song_id, True),
        "rating": (fieldtypes.rating, True),
    }
    sync_across_sessions = True

    async def post(self):
        self.rate(self.get_argument("song_id"), self.get_argument("rating"))
        self.write_rainwave_output()

    def rate(self, song_id, rating):
        if not self.user.data["rate_anything"]:
            acl = cache.get_station(self.sid, "user_rating_acl")
            sched_current = cache.get_station(self.sid, "sched_current")
            if not sched_current or not sched_current.get_song().id == song_id:
                if not acl or not song_id in acl or not self.user.id in acl[song_id]:
                    raise APIException("cannot_rate_now")
            elif not self.user.is_tunedin():
                raise APIException("tunein_to_rate_current_song")
        albums = ratinglib.set_song_rating(self.sid, song_id, self.user.id, rating)
        self.append_standard(
            "rating_submitted",
            updated_album_ratings=albums,
            song_id=song_id,
            rating_user=rating,
        )

    def clear_rating(self, song_id):
        albums = ratinglib.clear_song_rating(self.sid, song_id, self.user.id)
        s = playlist.Song.load_from_id(song_id, self.sid)
        self.append_standard(
            "rating_submitted",
            updated_album_ratings=albums,
            song_id=song_id,
            rating_user=None,
            rating=s.data["rating"],
        )
