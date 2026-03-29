from typing import cast

from api import rainwave_dto
from api.handle_url import handle_api_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.handler_classes.api_handler import APIHandler
from api.rainwave_typeddicts import ElecBlockedBy
from common.db.cursor import get_cursor
from common.playlist.song.model.song_on_station import SongOnStation
from common.playlist.song_group.load_groups_from_song_id import (
    load_groups_for_song_on_station,
)


@handle_api_url("song")
class SongHandler(APIHandler):
    description = "Get detailed information about a song."

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "song"

    async def post(self):
        input = self.get_validated_input(rainwave_dto.Api4SongPostRequest)
        async with get_cursor() as cursor:
            song_on_station = await SongOnStation.load(cursor, input.id, self.sid)
            extra_detail = await song_on_station.load_extra_detail(cursor)
            # Artists must always be gotten from the stored parseable here.
            # If parseable is not available, this is a bug in either test setup
            # or in the SongFile class when songs are written to the database.
            artists = song_on_station.get_artists_from_parseable()
            groups = await load_groups_for_song_on_station(cursor, input.id, self.sid)

            self.response["song"] = {
                "album": [
                    {
                        "id": song_on_station.data["album_id"],
                        "name": song_on_station.data["album_name"],
                    }
                ],
                "artists": [
                    {"id": artist["id"], "name": artist["name"], "order": artist_idx}
                    for artist_idx, artist in enumerate(artists)
                ],
                "cool": song_on_station.data["song_cool"],
                "elec_blocked": song_on_station.data["song_elec_blocked"],
                "elec_blocked_by": cast(
                    ElecBlockedBy, song_on_station.data["song_elec_blocked_by"]
                ),
                "groups": [
                    {"id": group["group_id"], "name": group["group_name"]}
                    for group in groups
                ],
                "origin_sid": song_on_station.data["song_origin_sid"],
                "rating_allowed": (
                    True
                    if self.optional_user and self.optional_user.private_data["perks"]
                    else False
                ),
                "rating_count": song_on_station.data["song_rating_count"],
                "rating_rank": extra_detail["song_rating_rank"],
                "rating_rank_percentile": extra_detail["song_rating_rank_percentile"],
                "rating_histogram": extra_detail["song_rating_histogram"],
                "request_count": 0,
                "request_rank": 0,
                "request_rank_percentile": 0,
                "sid": self.sid,
            }
