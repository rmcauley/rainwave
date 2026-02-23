@handle_api_url("artist")
class ArtistHandler(APIHandler):
    description = "Get detailed information about an artist."
    return_name = "artist"
    fields = {"id": (fieldtypes.artist_id, True)}

    def post(self):
        artist = playlist.Artist.load_from_id(self.get_argument("id"))
        artist.load_all_songs(self.sid, self.user.id)
        self.append(self.return_name, artist.to_dict_full(self.user))
