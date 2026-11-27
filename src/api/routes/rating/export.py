from asyncio import Future
from typing import Any, List

import orjson
from api.exceptions import APIException
from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from api.handle_url import handle_api_url
from tornado.web import RequestHandler

from api.rainwave_typeddicts import RatingsExportItem
from common.db.cursor import get_cursor

PAGE_SIZE = 2000


@handle_api_url("ratings_export")
class RatingsExportHandler(RegisteredUserAPIHandler):
    login_required = True
    tunein_required = False
    unlocked_listener_only = False
    pretty_print_html = False

    def finish(self, chunk: Any = None) -> Future[None]:
        # Bypass parent class finish, as it expects to dump results from
        # self.response and we want a streaming download for this
        # bulkier endpoint.
        return RequestHandler.finish(self, chunk)

    async def get(self) -> None:
        if self.websocket_handling:
            raise APIException("404")

        self.set_header(
            "Content-Disposition", 'attachment; filename="rainwave_export.json"'
        )

        async with get_cursor() as cursor:
            self.write('{"ratings_export":[')
            # Send headers and first bytes
            await self.flush()

            last_id = 0
            while True:
                rows = await cursor.fetch_all(
                    """
                    SELECT 
                        r4_song_ratings.song_id AS song_id, 
                        song_title, 
                        album_name, 
                        song_rating_user AS rating_user
                    FROM r4_song_ratings
                        JOIN r4_songs USING (song_id)
                        JOIN r4_albums USING (album_id)
                    WHERE 
                        r4_song_ratings.user_id = %s
                        AND r4_song_ratings.song_rating_user IS NOT NULL
                        AND r4_songs.song_validated = TRUE
                        AND r4_song_ratings.song_id > %s 
                    ORDER BY r4_song_ratings.song_id
                    LIMIT %s
                    """,
                    (self.user.id, last_id, PAGE_SIZE),
                    row_type=RatingsExportItem,
                )
                if not rows:
                    break
                parts: List[str] = []
                for row in rows:
                    parts.append(
                        orjson.dumps(
                            {
                                "rating_user": row["rating_user"],
                                "id": row["song_id"],
                                "song_title": row["song_title"],
                                "album_name": row["album_name"],
                            }
                        ).decode()
                    )
                self.write(",".join(parts))
                await self.flush()
                last_id = rows[-1]["song_id"]
            self.write("]}")
        await self.finish()
