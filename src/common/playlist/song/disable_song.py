from common import log
from common.db.cursor import RainwaveCursor
from common.playlist.song.set_song_sids import set_song_sids


async def disable_song(cursor: RainwaveCursor, song_id: int) -> None:
    log.info("song_disable", "Disabling ID %s" % (song_id,))
    await cursor.update(
        "UPDATE r4_songs SET song_verified = FALSE WHERE song_id = %s",
        (song_id,),
    )
    await cursor.update(
        "UPDATE r4_song_sid SET song_exists = FALSE WHERE song_id = %s",
        (song_id,),
    )
    await cursor.update("DELETE FROM r4_request_store WHERE song_id = %s", (song_id,))

    await set_song_sids(cursor, song_id, [])
