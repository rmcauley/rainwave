def register_routes() -> None:
    # Import route modules for decorator side effects.
    from . import (
        cooldown,
        dj,
        dj_election,
        donations,
        enable_perks,
        groups,
        js_errors,
        power_hours,
        producers,
        request_line,
        scan_errors,
        song_request_only,
        update_user_avatar,
        update_user_nickname,
        user_search,
    )

    _ = (
        cooldown,
        dj,
        dj_election,
        donations,
        enable_perks,
        groups,
        js_errors,
        power_hours,
        producers,
        request_line,
        scan_errors,
        song_request_only,
        update_user_avatar,
        update_user_nickname,
        user_search,
    )


__all__ = ["register_routes"]
