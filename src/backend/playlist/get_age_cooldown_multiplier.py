from time import time as timestamp
import math

from backend import config


def get_age_cooldown_multiplier(added_on: int) -> float:
    age_weeks = (int(timestamp()) - added_on) / 604800.0
    cool_age_multiplier = 1.0
    if age_weeks < config.cooldown_age_threshold:
        s2_end = config.cooldown_age_threshold
        s2_start = config.cooldown_age_stage2_start
        s2_min_multiplier = config.cooldown_age_stage2_min_multiplier
        s1_min_multiplier = config.cooldown_age_stage1_min_multiplier
        # Age Cooldown Stage 1
        if age_weeks <= s2_start:
            cool_age_multiplier = (age_weeks / s2_start) * (
                s2_min_multiplier - s1_min_multiplier
            ) + s1_min_multiplier
        # Age Cooldown Stage 2
        else:
            cool_age_multiplier = s2_min_multiplier + (
                (1.0 - s2_min_multiplier)
                * (
                    (0.32436 - (s2_end / 288.0) + (math.pow(s2_end, 2.0) / 38170.0))
                    * math.log(2.0 * age_weeks + 1.0)
                )
            )
    return cool_age_multiplier
