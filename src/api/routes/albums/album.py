from api import rainwave_dto
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.auth_required_handler import AuthRequiredAPIHandler
from common import config

from common.db.cursor import get_cursor
from common.playlist.album.get_album_on_station import get_album_on_station
from common.playlist.album.get_song_list_for_album_display import (
    get_songs_for_album_display,
)


@handle_api_url("album")
class AlbumHandler(AuthRequiredAPIHandler):
    description = "Get detailed information about an album, including a list of songs in the album.  'Sort' can be set to 'added_on' to sort by when the song was added to the radio."
    return_name = "album"

    async def post(self):
        input = self.get_validated_input(rainwave_dto.Api4AlbumPostRequest)
        async with get_cursor() as cursor:
            album = await get_album_on_station(
                cursor,
                input.id,
                self.sid,
            )
            if not album:
                raise APIException("404")

            extra_detail = await album.load_extra_detail(cursor)

            songs = await get_songs_for_album_display(
                cursor, album.album_id, self.sid, self.user.id, input.sort
            )

            self.response["album"] = {
                "id": album.album_id,
                "name": album.data["album_name"],
                "genres": extra_detail["album_genres"],
                "rating_complete": False,
                "rating_histogram": extra_detail["album_rating_histogram"],
                "rating_rank": extra_detail["album_rating_rank"],
                "rating_rank_percentile": extra_detail["album_rating_rank_percentile"],
                "request_count": album.data["album_request_count"],
                "request_rank": extra_detail["album_request_rank"],
                "request_rank_percentile": extra_detail[
                    "album_request_rank_percentile"
                ],
                "songs": [
                    {
                        "id": song["id"],
                        "title": song["title"],
                        "length": song["length"],
                        "origin_sid": song["origin_sid"],
                        "added_on": song["added_on"],
                        "rating": song["rating"],
                        "url": song["url"],
                        "link_text": song["link_text"],
                        "rating_user": song["rating_user"],
                        "fave": song["fave"],
                        "requestable": song["requestable"],
                        "cool": song["cool"],
                        "cool_end": song["cool_end"] or 0,
                        "request_only_end": song["request_only_end"],
                        "request_only": song["request_only"],
                        "artist_parseable": song["artist_parseable"],
                    }
                    for song in songs
                ],
            }
        self.write_rainwave_output()
