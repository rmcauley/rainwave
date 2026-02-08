_AVATAR_PATH = "/forums/download/file.php?avatar=%s"
_DEFAULT_AVATAR = "/static/images4/user.svg"


def solve_avatar(avatar_type: str, avatar: str) -> str:
    if avatar_type == "avatar.driver.upload":
        return _AVATAR_PATH % avatar
    elif avatar_type == "avatar.driver.remote":
        return avatar
    else:
        return _DEFAULT_AVATAR
