from api import fieldtypes, rainwave_typeddicts
from api.handle_url import handle_api_url
from api.exceptions import APIException
from api.handler_classes.auth_required_handler import AuthRequiredAPIHandler
from api.rainwave_dto import Api4SearchPostRequest
from common.db.cursor import get_cursor
from common.playlist.remove_diacritics import remove_diacritics
from typing import TypedDict


class SearchArtistRow(TypedDict):
    id: int
    name: str


class SearchAlbumRow(TypedDict):
    id: int
    name: str
    cool: bool
    rating: float
    fave: bool
    rating_user: float
    rating_complete: bool


class SearchSongRow(TypedDict):
    id: int
    length: int
    origin_sid: int
    title: str
    added_on: int
    url: str | None
    link_text: str | None
    rating: float
    requestable: bool
    cool: bool
    cool_end: int
    artist_parseable: str
    rating_user: float
    fave: bool
    album_name: str
    album_id: int


@handle_api_url("search")
class SearchHandler(AuthRequiredAPIHandler):
    description = "Search artists, albums, and songs for a matching string.  Case insensitive.  Submitted string will be stripped of accents and punctuation."
    return_name = "search_results"
    sid_required = True
    fields = {"search": (fieldtypes.string, True)}

    async def post(self):
        input = self.get_validated_input(Api4SearchPostRequest)
        async with get_cursor() as cursor:
            search_term = remove_diacritics(input.search)
            if len(search_term) < 3:
                raise APIException("search_string_too_short")

            search_term = f"%{search_term}%"

            artists = await cursor.fetch_all(
                """
                SELECT
                    DISTINCT artist_id AS id,
                    artist_name AS name
                FROM r4_song_sid
                    JOIN r4_song_artist USING (song_id)
                    JOIN r4_artists USING (artist_id)
                WHERE sid = %s
                    AND song_exists = TRUE
                    AND artist_name_searchable LIKE %s
                ORDER BY artist_name
                LIMIT 50
                """,
                (self.sid, search_term),
                row_type=rainwave_typeddicts.SearchArtist,
            )

            if self.user.is_anonymous():
                albums = await cursor.fetch_all(
                    """
                    SELECT
                        DISTINCT album_id AS id,
                        album_name AS name,
                        album_cool AS cool,
                        CAST(ROUND(CAST(album_rating AS NUMERIC), 1) AS REAL) AS rating,
                        FALSE AS fave,
                        CAST(0.0 AS REAL) AS rating_user,
                        FALSE AS rating_complete
                    FROM r4_album_sid
                        JOIN r4_albums USING (album_id)
                    WHERE sid = %s
                        AND album_exists = TRUE
                        AND album_name_searchable LIKE %s
                    ORDER BY album_name
                    LIMIT 50
                    """,
                    (self.sid, search_term),
                    row_type=rainwave_typeddicts.SearchAlbum,
                )
            else:
                albums = await cursor.fetch_all(
                    """
                    SELECT
                        DISTINCT r4_albums.album_id AS id,
                        album_name AS name,
                        album_cool AS cool,
                        CAST(ROUND(CAST(album_rating AS NUMERIC), 1) AS REAL) AS rating,
                        COALESCE(album_fave, FALSE) AS fave,
                        COALESCE(album_rating_user, 0) AS rating_user,
                        COALESCE(album_rating_complete, FALSE) AS rating_complete
                    FROM r4_album_sid
                        JOIN r4_albums USING (album_id)
                        LEFT JOIN r4_album_ratings ON (
                            r4_albums.album_id = r4_album_ratings.album_id AND r4_album_ratings.user_id = %s 
                            AND r4_album_ratings.sid = %s
                        )
                        LEFT JOIN r4_album_faves ON (
                            r4_albums.album_id = r4_album_faves.album_id 
                            AND r4_album_faves.user_id = %s
                        )
                    WHERE 
                        r4_album_sid.sid = %s
                        AND album_exists = TRUE
                        AND album_name_searchable LIKE %s
                    ORDER BY album_name
                    LIMIT 50
                    """,
                    (self.user.id, self.sid, self.user.id, self.sid, search_term),
                    row_type=rainwave_typeddicts.SearchAlbum,
                )

            # base SQL here copy pasted from /rainwave/playlist_objects/album.py
            if self.user.is_anonymous():
                songs = await cursor.fetch_all(
                    """
                    SELECT
                        r4_song_sid.song_id AS id,
                        song_length AS length,
                        song_origin_sid AS origin_sid,
                        song_title AS title,
                        song_added_on AS added_on,
                        song_url AS url,
                        song_link_text AS link_text,
                        CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating,
                        FALSE AS requestable,
                        song_cool AS cool,
                        song_cool_end AS cool_end,
                        song_artist_parseable AS artist_parseable,
                        CAST(0.0 AS REAL) AS rating_user,
                        FALSE AS fave,
                        r4_albums.album_name,
                        r4_songs.album_id
                    FROM r4_song_sid
                    JOIN r4_songs ON (
                        r4_song_sid.song_id = r4_songs.song_id 
                        AND r4_songs.song_title_searchable LIKE %s
                    )
                    JOIN r4_albums ON (
                        r4_songs.album_id = r4_albums.album_id
                    )
                    WHERE r4_song_sid.song_exists = TRUE
                        AND r4_songs.song_verified = TRUE
                        AND r4_song_sid.sid = %s
                    ORDER BY album_name,
                        song_title
                    LIMIT 100
                    """,
                    (search_term, self.sid),
                    row_type=rainwave_typeddicts.SearchSong,
                )
            else:
                songs = await cursor.fetch_all(
                    """
                    SELECT
                        r4_song_sid.song_id AS id,
                        song_length AS length,
                        song_origin_sid AS origin_sid,
                        song_title AS title,
                        song_added_on AS added_on,
                        song_url AS url,
                        song_link_text AS link_text,
                        CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating,
                        TRUE AS requestable,
                        song_cool AS cool,
                        song_cool_end AS cool_end,
                        song_artist_parseable AS artist_parseable,
                        COALESCE(song_rating_user, 0) AS rating_user,
                        COALESCE(song_fave, FALSE) AS fave,
                        r4_albums.album_name,
                        r4_songs.album_id
                    FROM r4_song_sid
                        JOIN r4_songs ON (
                            r4_song_sid.song_id = r4_songs.song_id 
                            AND r4_songs.song_title_searchable LIKE %s
                        )
                        LEFT JOIN r4_song_ratings ON (
                            r4_song_sid.song_id = r4_song_ratings.song_id 
                            AND user_id = %s
                        )
                        JOIN r4_albums ON (
                            r4_songs.album_id = r4_albums.album_id
                        )
                    WHERE r4_song_sid.song_exists = TRUE
                        AND r4_songs.song_verified = TRUE
                        AND r4_song_sid.sid = %s
                    ORDER BY album_name, song_title
                    LIMIT 100
                    """,
                    (search_term, self.user.id, self.sid),
                    row_type=rainwave_typeddicts.SearchSong,
                )

            self.response["artists"] = artists
            self.response["albums"] = albums
            self.response["songs"] = songs

        self.write_rainwave_output()
