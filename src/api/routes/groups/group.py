from typing import Literal, cast

from psycopg import sql
from api import rainwave_dto, rainwave_typeddicts
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from common import stations
from common.db.cursor import get_cursor
from common.playlist.artist.get_song_list_for_artist_display import (
    SongListForArtistDisplayRow,
    get_select_sql_for_songs_for_artist_or_group_display,
)
from common.playlist.song_group.song_group import SongGroupRow


@handle_api_url("group")
class GroupHandler(APIHandler):
    description = "Get detailed information about a song group."
    return_name = "group"

    async def post(self) -> None:
        input = self.get_validated_input(rainwave_dto.Api4GroupPostRequest)
        async with get_cursor() as cursor:
            group = await cursor.fetch_row(
                "SELECT * FROM r4_groups WHERE group_id = %s",
                (input.id,),
                row_type=SongGroupRow,
            )
            if not group:
                raise APIException("404")

            song_query = get_select_sql_for_songs_for_artist_or_group_display() + sql.SQL(
                """
                FROM r4_song_group
                    JOIN r4_songs USING (song_id) 
                    JOIN r4_song_sid ON (r4_songs.song_id = r4_song_sid.song_id AND r4_song_sid.sid = %s)
                    JOIN r4_albums USING (album_id) 
                    LEFT JOIN r4_song_ratings ON (r4_song_group.song_id = r4_song_ratings.song_id AND r4_song_ratings.user_id = %s) 
                WHERE r4_song_group.group_id = %s AND r4_songs.song_verified = TRUE 
                ORDER BY song_exists DESC, album_name, song_title
                """
            )
            song_query_params = (
                self.sid,
                self.optional_user.id if self.optional_user else 1,
                input.id,
            )

            # all_songs_for_sid[album_id][station_id] = [song1, song2...]
            all_songs_for_sid: dict[
                str, dict[str, list[rainwave_typeddicts.SongInArtist]]
            ] = {}
            requestable = (
                True
                if self.optional_user and not self.optional_user.is_anonymous()
                else False
            )
            async for song in cursor.for_each_row(
                song_query, song_query_params, row_type=SongListForArtistDisplayRow
            ):
                if not song["sid"] in stations.station_ids:
                    continue

                song["requestable"] = requestable and song["requestable"]

                album_id_index = str(song["album_id"])
                sid_index = cast(
                    Literal["1", "2", "3", "4", "5", "6"], str(song["sid"])
                )

                if not all_songs_for_sid.get(album_id_index, None):
                    all_songs_for_sid[album_id_index] = {}
                album_dict = all_songs_for_sid.get(album_id_index, {})

                if not sid_index in album_dict:
                    album_dict[sid_index] = []

                album_dict[sid_index].append(
                    {
                        "albums": [
                            {"id": song["album_id"], "name": song["album_name"]}
                        ],
                        "id": song["id"],
                        "sid": cast(rainwave_typeddicts.StationId, song["sid"]),
                        "title": song["title"],
                        "rating": song["rating"],
                        "requestable": song["requestable"],
                        "length": song["length"],
                        "cool": song["cool"],
                        "url": song["url"],
                        "link_text": song["link_text"],
                        "rating_user": song["rating_user"],
                        "fave": song["fave"],
                    }
                )
            self.response["group"] = {
                "all_songs_for_sid": all_songs_for_sid,
                "id": group["group_id"],
                "name": group["group_name"],
            }
        self.write_rainwave_output()
