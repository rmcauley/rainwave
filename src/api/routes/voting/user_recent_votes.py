from typing import cast, Any
import math

from api.handler_classes.api_handler import APIHandler
from api.web import PrettyPrintAPIMixin
from api import fieldtypes
from api.handle_url import handle_api_url
from api.handle_url import handle_api_html_url

try:
    import ujson as json
except ImportError:
    import json

from libs import cache
from common.libs import db
from common import config
from libs.pretty_date import pretty_date
from common.rainwave import playlist
from common.rainwave.playlist_objects.metadata import MetadataNotFoundError
from api.exceptions import APIException


@handle_api_url("user_recent_votes")
class RecentlyVotedSongs(APIHandler):
    description = "Shows the user's recently voted on songs."
    return_name = "user_recent_votes"
    login_required = True
    sid_required = True
    pagination = True

    def post(self):
        self.append(
            self.return_name,
            await cursor.fetch_all(
                """
                SELECT
                    r4_songs.song_id AS id,
                    song_title AS title,
                    album_name,
                    CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating,
                    song_rating_user AS rating_user,
                    song_fave AS fave
                FROM r4_vote_history
                    JOIN r4_song_sid USING (song_id, sid)
                    JOIN r4_songs USING (song_id)
                    JOIN r4_albums USING (album_id)
                    LEFT JOIN r4_song_ratings ON (
                        r4_songs.song_id = r4_song_ratings.song_id 
                        AND r4_song_ratings.user_id = r4_vote_history.user_id
                    )
                WHERE r4_vote_history.sid = %s
                    AND r4_vote_history.user_id = %s
                    AND song_verified = TRUE
                ORDER BY vote_id DESC
"""
                + self.get_sql_limit_string(),
                (self.sid, self.user.id),
            ),
        )


@handle_api_html_url("user_recent_votes")
class RecentlyVotedSongsHTML(PrettyPrintAPIMixin, RecentlyVotedSongs):
    pass
