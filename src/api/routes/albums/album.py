@handle_api_url("album")
class AlbumHandler(APIHandler):
    description = "Get detailed information about an album, including a list of songs in the album.  'Sort' can be set to 'added_on' to sort by when the song was added to the radio."
    return_name = "album"
    fields = {
        "id": (fieldtypes.album_id, True),
        "sort": (fieldtypes.string, None),
        "all_categories": (fieldtypes.boolean, None),
    }

    def post(self):
        try:
            album = playlist.Album.load_from_id_with_songs(
                self.get_argument("id"),
                self.sid,
                self.user,
                sort=self.get_argument("sort"),
            )
            album.load_extra_detail(
                self.sid, self.get_argument_bool("all_categories") or False
            )
        except MetadataNotFoundError:
            self.return_name = "album_error"
            valid_sids = await cursor.fetch_list(
                "SELECT sid FROM r4_album_sid WHERE album_id = %s ORDER BY sid",
                (self.get_argument("id"),),
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
        self.append("album", album.to_dict_full(self.user))
