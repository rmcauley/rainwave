def get_all_artists(sid: int) -> list[playlist.Artist]:
    return cast(list[playlist.Artist], cache.get_station(sid, "all_artists"))


@handle_api_url("all_artists")
class AllArtistsHandler(APIHandler):
    description = "Get a list of all artists on the station playlist."
    return_name = "all_artists"
    fields = {"no_searchable": (fieldtypes.boolean, None)}

    def post(self):
        self.append(
            self.return_name,
            get_all_artists(self.sid),
        )
