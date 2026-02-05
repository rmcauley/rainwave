    def load_from_id_sid(cls, album_id, sid):
        row = db.c.fetch_row(
            "SELECT r4_albums.*, album_rating, album_rating_count, album_cool, album_cool_lowest, album_cool_multiply, album_cool_override FROM r4_album_sid JOIN r4_albums USING (album_id) WHERE r4_album_sid.album_id = %s AND r4_album_sid.sid = %s",
            (album_id, sid),
        )
        if not row:
            raise MetadataNotFoundError(
                "%s ID %s for sid %s could not be found."
                % (cls.__name__, album_id, sid)
            )
        instance = cls()
        instance._assign_from_dict(row, sid)
        instance.sid = sid
        return instance
