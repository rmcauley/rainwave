import random
import string


def generate_listen_key() -> str:
    return "".join(
        random.choices(
            string.ascii_uppercase + string.digits + string.ascii_lowercase, k=10
        )
    )
