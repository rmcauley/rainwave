@handle_api_url("fave_album")
class SubmitAlbumFave(SubmitSongFave):
    sid_required = True
    _fave_type = "album"
    description = "Fave or un-fave an album, specific to the station the request is being made on."
    fields = {
        "album_id": (fieldtypes.album_id, True),
        "fave": (fieldtypes.boolean, True),
    }
    sync_across_sessions = True
