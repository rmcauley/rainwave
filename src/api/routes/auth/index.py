from . import oauth_handler


def register_routes() -> None:
    # Import route modules for decorator side effects.
    from . import (
        debug,
        discord,
        errors,
        login,
        logout,
        tos_privacy,
    )

    _ = (debug, discord, errors, login, logout, oauth_handler, tos_privacy)


__all__ = ["register_routes"]
