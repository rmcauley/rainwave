from backend.db.cursor import RainwaveCursor


async def get_rating_points(cursor: RainwaveCursor) -> None:
    """
    Send in an SQL cursor that's the entire result of a query that has 2 columns: 'rating' and 'count'.
    Uses "rating_map" from config to map each rating tier's to the fraction of point(s) it should get.
    Returns a set: (points, potential_points)
    """
    # This can be done in SQL
    # point_map = config.rating_map
    # points = 0.0
    # potential_points = 0.0
    # while row = cursor.fetch_next_row(row_type):
    #     tier_points = 0
    #     potential_points += row["count"]
    #     for tier in point_map:
    #         if row["rating"] >= tier["threshold"]:
    #             tier_points = row["count"] * tier["points"]
    #     points += tier_points
    # points = min(potential_points, max(0, points))

    # return (points, potential_points)
