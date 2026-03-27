from common import config, log
from common.db.cursor import RainwaveCursor
from common.ratings.rating_calculator import RatingMapReadyDict, rating_calculator


async def update_song_rating(cursor: RainwaveCursor, song_id: int) -> tuple[float, int]:
    ratings = await cursor.fetch_all(
        """
        SELECT 
            song_rating_user AS rating,
            COUNT(user_id) AS count
        FROM r4_song_ratings 
            JOIN phpbb_users USING (user_id) 
        WHERE 
            song_id = %s 
            AND radio_inactive = FALSE 
            AND song_rating_user IS NOT NULL 
        GROUP BY song_rating_user
        """,
        (song_id,),
        row_type=RatingMapReadyDict,
    )
    rating, rating_count = rating_calculator(ratings)

    log.debug("song_rating", "%s ratings for %s" % (rating_count, song_id))

    if rating_count < config.rating_threshold_for_calc:
        rating = 0

    log.debug(
        "song_rating",
        "rating update: %s for %s" % (rating, song_id),
    )
    await cursor.update(
        "UPDATE r4_songs SET song_rating = %s, song_rating_count = %s WHERE song_id = %s",
        (rating, rating_count, song_id),
    )
    return (rating, rating_count)
