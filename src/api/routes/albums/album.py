from typing import TypedDict

from api import rainwave_dto, rainwave_typeddicts
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.auth_required_handler import AuthRequiredAPIHandler

from common.db.cursor import get_cursor
from common.playlist.album.get_album_on_station import get_album_on_station
from common.playlist.album.get_song_list_for_album_display import (
    get_songs_for_album_display,
)


class AlbumDetailRatingRow(TypedDict):
    album_rating_user: float | None
    album_fave: bool | None


@handle_api_url("album")
class AlbumHandler(AuthRequiredAPIHandler):
    description = "Get detailed information about an album, including a list of songs in the album.  'Sort' can be set to 'added_on' to sort by when the song was added to the radio."
    return_name = "album"

    async def post(self) -> None:
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

            album_rating_user: float | None = None
            album_fave = False
            if not self.user.is_anonymous():
                album_rating_row = await cursor.fetch_row(
                    """
                    SELECT 
                        album_rating_user, 
                        album_fave 
                    FROM r4_album_sid 
                        LEFT JOIN r4_album_ratings ON (
                            r4_album_sid.album_id = r4_album_ratings.album_id
                            AND r4_album_sid.sid = r4_album_ratings.sid
                        )
                        LEFT JOIN r4_album_faves ON (
                            r4_album_sid.album_id = r4_album_faves.album_id
                        )
                    WHERE
                        r4_album_sid.album_id = %s
                        AND r4_album_sid.sid = %s
                    """,
                    (input.id, self.sid),
                    row_type=AlbumDetailRatingRow,
                )
                if album_rating_row:
                    album_rating_user = album_rating_row["album_rating_user"]
                    album_fave = album_rating_row["album_fave"] or False

            songs_on_album: list[rainwave_typeddicts.SongOnAlbum] = []
            for song in songs:
                song_on_album: rainwave_typeddicts.SongOnAlbum = {
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
                    "artist_parseable": song["artist_parseable"],
                }
                songs_on_album.append(song_on_album)

            self.response["album"] = {
                "added_on": album.data["album_added_on"],
                "art": album.data["album_art_url"],
                "cool_lowest": album.data["album_cool_lowest"],
                "cool": album.data["album_cool"],
                "fave_count": album.data["album_fave_count"],
                "fave": album_fave,
                "played_last": album.data["album_played_last"],
                "rating_count": album.data["album_rating_count"],
                "rating_user": album_rating_user,
                "rating": album.data["album_rating"],
                "song_count": 0,
                "vote_count": 0,
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
                "songs": songs_on_album,
            }
