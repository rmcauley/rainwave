from typing import TypeAlias, TypedDict


class RatingMapEntry(TypedDict):
    threshold: float
    points: float


RatingMap: TypeAlias = list[RatingMapEntry]

# Map user-facing ratings to raw points in the rating formula.
rating_map: RatingMap = [
    {"threshold": 0, "points": -0.2},
    {"threshold": 1.5, "points": 0.0},
    {"threshold": 2.0, "points": 0.1},
    {"threshold": 2.5, "points": 0.2},
    {"threshold": 3.0, "points": 0.5},
    {"threshold": 3.5, "points": 0.75},
    {"threshold": 4.0, "points": 0.9},
    {"threshold": 4.5, "points": 1.0},
    {"threshold": 5.0, "points": 1.1},
]


class RatingMapReadyDict(TypedDict):
    rating: float
    count: int


def rating_calculator(
    ratings: list[RatingMapReadyDict],
) -> tuple[float, int]:
    points = 0.0
    rating_count = 0
    for row in ratings:
        tier_points = 0.0
        rating_count += row["count"]
        for tier in rating_map:
            if row["rating"] >= tier["threshold"]:
                tier_points = row["count"] * tier["points"]
        points += tier_points
    points = min(rating_count, max(0, points))

    rating = ((points / rating_count) * 4) + 1

    return (rating, rating_count)
