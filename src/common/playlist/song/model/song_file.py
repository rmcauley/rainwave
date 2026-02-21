import orjson
import os
from psycopg import sql
from typing import TypedDict


from common.db.build_insert import build_insert_on_conflict_do_update
from common.db.cursor import RainwaveCursor
from common import log
from common.playlist.album.model.album_on_station import AlbumOnStation
from common.playlist.remove_diacritics import remove_diacritics
from common.playlist.album.model.album import Album
from common.playlist.artist.artist import Artist
from common.playlist.song.get_groups_for_song import get_groups_for_song
from common.playlist.song.get_album_for_song import get_album_for_song
from scanner.get_tags_from_song import load_tag_from_file
from common.playlist.song.model.song_on_station import ArtistParseable
from common.playlist.song.replaygain import get_gain_for_song
from common.playlist.song_group.song_group import SongGroup


class SongInsertDict(TypedDict):
    album_id: int
    song_origin_sid: int
    song_verified: bool
    song_scanned: bool
    song_filename: str
    song_title: str
    song_title_searchable: str
    song_artist_tag: str
    song_url: str | None
    song_link_text: str | None
    song_length: int
    song_file_mtime: int
    song_replay_gain: str
    song_artist_parseable: str


class SongFileRow(SongInsertDict):
    song_id: int


class SongFile:
    filename: str
    existing_song_id: int | None

    def __init__(self, filename: str, existing_song_id: int | None):
        super().__init__()
        self.filename = filename
        self.existing_song_id = existing_song_id

    @staticmethod
    async def create(cursor: RainwaveCursor, filename: str) -> SongFile:
        existing_song_id = await cursor.fetch_var(
            "SELECT song_id FROM r4_songs WHERE song_filename = %s",
            (filename,),
            var_type=int,
        )
        return SongFile(filename, existing_song_id)

    async def set_sids(self, cursor: RainwaveCursor, new_sids: list[int]) -> None:
        if not self.existing_song_id:
            return

        existing_album = await get_album_for_song(cursor, self.existing_song_id)
        existing_groups = await get_groups_for_song(cursor, self.existing_song_id)

        current_sids = await cursor.fetch_list(
            "SELECT sid FROM r4_song_sid WHERE song_id = %s",
            (self.existing_song_id,),
            row_type=int,
        )
        log.debug(
            "playlist",
            "database sids: {}, new sids: {}".format(current_sids, new_sids),
        )

        for sid in current_sids:
            if sid not in new_sids:
                await cursor.update(
                    "UPDATE r4_song_sid SET song_exists = FALSE WHERE song_id = %s AND sid = %s",
                    (self.existing_song_id, sid),
                )
                if existing_album:
                    await AlbumOnStation.update_newest_song_time(
                        cursor, existing_album.id, sid
                    )
        for sid in new_sids:
            await cursor.update(
                """
                INSERT INTO r4_song_sid 
                    (song_id, sid, song_exists) 
                VALUES (%s, %s, TRUE) 
                ON CONFLICT DO UPDATE SET song_exists = TRUE
                """,
                (self.existing_song_id, sid),
            )
            if existing_album:
                await AlbumOnStation.update_newest_song_time(
                    cursor, existing_album.id, sid
                )

        if existing_album:
            await existing_album.reconcile_sids(cursor)

        for group in existing_groups:
            await group.reconcile_sids(cursor)

    async def upsert(
        self, cursor: RainwaveCursor, new_sids: list[int], origin_sid: int
    ) -> None:
        # If there are current albums/groups, this will update them before
        # we go assigning the new ones in here.
        # There is some duplicate work, but it saves us some headache
        # in state juggling if we do this distinctly in 2 steps.
        await self.set_sids(cursor, new_sids)

        tags = load_tag_from_file(self.filename)

        album = await Album.upsert(cursor, tags.album)
        artists = [
            await Artist.upsert(cursor, artist.strip())
            for artist in tags.artist.split(",")
        ]
        artist_parseable: list[ArtistParseable] = [
            {"id": artist.data["artist_id"], "name": artist.data["artist_name"]}
            for artist in artists
        ]

        groups = (
            [
                await SongGroup.upsert(cursor, group.strip())
                for group in tags.genre.split(",")
            ]
            if tags.genre
            else []
        )

        to_upsert: SongInsertDict = {
            "album_id": album.id,
            "song_artist_parseable": str(orjson.dumps(artist_parseable)),
            "song_artist_tag": tags.artist,
            "song_file_mtime": int(os.stat(self.filename)[8]),
            "song_filename": self.filename,
            "song_length": tags.length,
            "song_link_text": tags.comment,
            "song_origin_sid": origin_sid,
            "song_replay_gain": get_gain_for_song(self.filename),
            "song_scanned": True,
            "song_title": tags.title,
            "song_title_searchable": remove_diacritics(tags.title),
            "song_url": tags.url,
            "song_verified": True,
        }

        song_row = await cursor.fetch_row(
            build_insert_on_conflict_do_update("r4_songs", list(to_upsert.keys()))
            + sql.SQL(" RETURNING *"),
            to_upsert,
            row_type=SongFileRow,
        )
        if song_row is None:
            raise Exception(f"{self.filename} failed to insert into database.")

        await cursor.update(
            "DELETE FROM r4_song_artist WHERE song_id = %s AND artist_id NOT IN (%s)",
            (song_row["song_id"], [artist.id for artist in artists]),
        )
        artist_insert_rows = [
            (song_row["song_id"], artist.id, artist_order)
            for artist_order, artist in enumerate(artists)
        ]
        await cursor.update(
            sql.SQL(
                """
                INSERT INTO r4_song_artist (song_id, artist_id, artist_order) VALUES {values}
                ON CONFLICT DO UPDATE SET artist_order = EXCLUDED.artist_order
                """
            ).format(
                values=sql.SQL(", ").join(
                    sql.SQL("(%s, %s, %s)") for _ in artist_insert_rows
                )
            ),
            [v for row in artist_insert_rows for v in row],
        )

        await cursor.update(
            "DELETE FROM r4_song_group WHERE song_id = %s AND group_id NOT IN (%s)",
            (song_row["song_id"], [group.id for group in groups]),
        )
        group_insert_rows = [(song_row["song_id"], group.id) for group in groups]
        await cursor.update(
            sql.SQL(
                """
                INSERT INTO r4_song_group (song_id, group_id) VALUES {values}
                ON CONFLICT DO NOTHING
                """
            ).format(
                values=sql.SQL(", ").join(
                    sql.SQL("(%s, %s)") for _ in group_insert_rows
                )
            ),
            [v for row in group_insert_rows for v in row],
        )

        await self.set_sids(cursor, new_sids)

    async def disable_song(self, cursor: RainwaveCursor, song_id: int) -> None:
        log.info("song_disable", "Disabling ID %s" % (song_id,))
        await cursor.update(
            "UPDATE r4_songs SET song_verified = FALSE WHERE song_id = %s",
            (song_id,),
        )
        await cursor.update(
            "UPDATE r4_song_sid SET song_exists = FALSE WHERE song_id = %s",
            (song_id,),
        )
        await cursor.update(
            "DELETE FROM r4_request_store WHERE song_id = %s", (song_id,)
        )

        await self.set_sids(cursor, [])
