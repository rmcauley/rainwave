from api.rainwave_typeddicts import (
    RequestLine as APIRequestLine,
    RequestLineEntry as APIRequestLineEntry,
)
from common.requests.request_line_types import RequestLineEntry as BackendLineEntry


def request_line_to_api(request_line: list[BackendLineEntry]) -> APIRequestLine:
    api_line: APIRequestLine = []
    for entry in request_line:
        api_entry: APIRequestLineEntry = {
            "line_expiry_election": entry["line_expiry_election"],
            "line_expiry_tune_in": entry["line_expiry_tune_in"],
            "line_has_had_valid": entry["line_has_had_valid"],
            "line_wait_start": entry["line_wait_start"],
            "position": entry["position"],
            "skip": entry["skip"],
            "song": (
                None
                if not entry["song"]
                else {
                    "album_name": entry["song"]["album_name"],
                    "id": entry["song"]["id"],
                    "title": entry["song"]["title"],
                }
            ),
            "song_id": None if not entry["song"] else entry["song"]["id"],
            "user_id": entry["user_id"],
            "username": entry["username"],
        }
        api_line.append(api_entry)
    return api_line
