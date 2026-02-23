def get_all_albums(sid: int, user: Any | None = None) -> Any:
    if not user or user.is_anonymous():
        return cache.get_station(sid, "all_albums")
    else:
        return playlist.get_all_albums_list(sid, user)


@handle_api_url("all_albums")
class AllAlbumsHandler(APIHandler):
    description = "Get a list of all albums on the station playlist."
    return_name = "all_albums"
    fields = {"no_searchable": (fieldtypes.boolean, None)}

    def post(self):
        self.append(
            self.return_name,
            get_all_albums(
                self.sid,
                self.user,
            ),
        )
