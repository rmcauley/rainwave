from api import rainwave_typeddicts
from common.ratings.rating_calculator import RatingMapReadyDict


RatingHistogram = rainwave_typeddicts.RatingHistogram


def produce_rating_histogram(ratings: list[RatingMapReadyDict]) -> RatingHistogram:
    histo_ready_dict = {str(rating["rating"]): rating["count"] for rating in ratings}
    return {
        "1.0": histo_ready_dict.get("1.0", 0),
        "1.5": histo_ready_dict.get("1.5", 0),
        "2.0": histo_ready_dict.get("2.0", 0),
        "2.5": histo_ready_dict.get("2.5", 0),
        "3.0": histo_ready_dict.get("3.0", 0),
        "3.5": histo_ready_dict.get("3.5", 0),
        "4.0": histo_ready_dict.get("4.0", 0),
        "4.5": histo_ready_dict.get("4.5", 0),
        "5.0": histo_ready_dict.get("5.0", 0),
    }
