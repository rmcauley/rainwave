from typing import TypedDict

from api import rainwave_dto
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from common.db.cursor import get_cursor
from common.playlist.artist.get_song_list_for_artist_display import (
    get_song_list_by_album_for_artist_display,
)


class ArtistDetailRow(TypedDict):
    artist_id: int
    artist_name: str


@handle_api_url("artist")
class ArtistHandler(APIHandler):
    description = "Get detailed information about an artist."
    return_name = "artist"

    async def post(self):
        input = self.get_validated_input(rainwave_dto.Api4ArtistPostRequest)
        async with get_cursor() as cursor:
            artist = await cursor.fetch_row(
                "SELECT artist_id, artist_name FROM r4_artists WHERE artist_id = %s",
                (input.id,),
                row_type=ArtistDetailRow,
            )
            if not artist:
                raise APIException("404")

            songs = await get_song_list_by_album_for_artist_display(
                cursor,
                input.id,
                self.sid,
                self.optional_user.id if self.optional_user else 1,
            )

            self.response["artist"] = {
                "id": artist["artist_id"],
                "name": artist["artist_name"],
                "all_songs": songs,
            }
