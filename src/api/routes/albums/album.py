from api import fieldtypes
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from common import config
from common.rainwave import playlist
from common.rainwave.playlist_objects.metadata import MetadataNotFoundError
from common.libs import db
from libs import cache
from common.db.cursor import get_cursor


@handle_api_url("album")
class AlbumHandler(APIHandler):
    description = "Get detailed information about an album, including a list of songs in the album.  'Sort' can be set to 'added_on' to sort by when the song was added to the radio."
    return_name = "album"
    fields = {
        "id": (fieldtypes.album_id, True),
        "sort": (fieldtypes.string, None),
        "all_categories": (fieldtypes.boolean, None),
    }

    async def post(self):
        async with get_cursor() as cursor:
            try:
                album = playlist.Album.load_from_id_with_songs(
                    input.,
                    self.sid,
                    self.user,
                    sort=input.,
                )
                album.load_extra_detail(
                    self.sid, self.get_argument_bool("all_categories") or False
                )
            except MetadataNotFoundError:
                self.return_name = "album_error"
                valid_sids = await cursor.fetch_list(
                    "SELECT sid FROM r4_album_sid WHERE album_id = %s ORDER BY sid",
                    (input.,),
                )
                if config.default_station in valid_sids:
                    raise APIException(
                        "album_on_other_station",
                        available_station=config.station_id_friendly[
                            config.default_station
                        ],
                        available_sid=valid_sids[0],
                    )
                else:
                    raise APIException(
                        "album_on_other_station",
                        available_station=config.station_id_friendly[valid_sids[0]],
                        available_sid=valid_sids[0],
                    )
                    self.response["album"] = album.to_dict_full(self.user)
            self.write_rainwave_output()
