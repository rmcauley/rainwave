from backend.ratings.rating_calculator import RatingMapReadyDict


RatingHistogram = dict[str, int]


def produce_rating_histogram(ratings: list[RatingMapReadyDict]) -> RatingHistogram:
    return {str(rating["rating"]): rating["count"] for rating in ratings}
