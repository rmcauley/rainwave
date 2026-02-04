def register_routes() -> None:
    # Import route modules for decorator side effects.
    from . import (
        debug,
        discord,
        errors,
        login,
        logout,
        r4_mixin,
        tos_privacy,
    )

    _ = (debug, discord, errors, login, logout, r4_mixin, tos_privacy)


__all__ = ["register_routes"]
