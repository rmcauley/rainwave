@handle_api_url("song")
class SongHandler(APIHandler):
    description = "Get detailed information about a song."
    return_name = "song"
    fields = {
        "id": (fieldtypes.song_id, True),
        "all_categories": (fieldtypes.boolean, None),
    }

    def post(self):
        song = playlist.Song.load_from_id(
            self.get_argument("id"),
            self.sid,
            all_categories=self.get_argument_bool("all_categories") or False,
        )
        song.load_extra_detail(self.sid)
        self.append("song", song.to_dict(self.user))
