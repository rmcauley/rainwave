
    @classmethod
    def load_from_id_with_songs(cls, album_id, sid, user=None, sort=None):
        row = db.c.fetch_row(
            "SELECT * FROM r4_albums JOIN r4_album_sid USING (album_id) WHERE album_id = %s AND sid = %s",
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
        user_id = None if not user else user.id
        requestable = bool(user)
        sql = (
            "SELECT r4_song_sid.song_id AS id, song_length AS length, song_origin_sid AS origin_sid, song_title AS title, song_added_on AS added_on, "
            "song_url AS url, song_link_text AS link_text, CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating, song_cool_multiply AS cool_multiply, "
            "song_cool_override AS cool_override, %s AS requestable, song_cool AS cool, song_cool_end AS cool_end, "
            "song_request_only_end AS request_only_end, song_request_only AS request_only, song_artist_parseable AS artist_parseable, "
            "COALESCE(song_rating_user, 0) AS rating_user, COALESCE(song_fave, FALSE) AS fave "
            "FROM r4_song_sid "
            "JOIN r4_songs USING (song_id) "
            "LEFT JOIN r4_song_ratings ON (r4_song_sid.song_id = r4_song_ratings.song_id AND user_id = %s) "
            "WHERE r4_song_sid.song_exists = TRUE AND r4_songs.song_verified = TRUE AND r4_songs.album_id = %s AND r4_song_sid.sid = %s "
        )
        if sort and sort == "added_on":
            sql += "ORDER BY song_added_on DESC, r4_songs.song_id DESC "
        else:
            sql += "ORDER BY song_title "
        instance.data["songs"] = db.c.fetch_all(
            sql, (requestable, user_id, instance.id, sid)
        )
        return instance
