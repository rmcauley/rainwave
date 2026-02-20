AVATAR_PATH = "/forums/download/file.php?avatar=%s"
DEFAULT_AVATAR = "/static/images4/user.svg"


def solve_avatar(avatar_type: str, avatar: str | None) -> str:
    if avatar_type == "avatar.driver.upload":
        return AVATAR_PATH % avatar
    elif avatar_type == "avatar.driver.remote" and avatar:
        return avatar
    else:
        return DEFAULT_AVATAR
