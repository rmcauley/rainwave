from api.handler_classes.rainwave_handler import RainwaveHandler


def attach_info_to_request(
    request: RainwaveHandler,
    extra_list: str | None = None,
    all_lists: bool = False,
    live_voting: bool = False,
) -> None:
    if request.user:
        request.append("user", request.user.to_private_dict())

    if not request.mobile:
        if (
            all_lists
            or (extra_list == "all_albums")
            or (extra_list == "album")
            or "all_albums" in request.request.arguments
        ):
            request.append(
                "all_albums",
                routes.playlist.get_all_albums(request.sid, request.user),
            )
        else:
            request.append("album_diff", cache.get_station(request.sid, "album_diff"))

        if (
            all_lists
            or (extra_list == "all_artists")
            or (extra_list == "artist")
            or "all_artists" in request.request.arguments
        ):
            request.append("all_artists", routes.playlist.get_all_artists(request.sid))

        if (
            all_lists
            or (extra_list == "all_groups")
            or (extra_list == "group")
            or "all_groups" in request.request.arguments
        ):
            request.append("all_groups", routes.playlist.get_all_groups(request.sid))

        if (
            all_lists
            or (extra_list == "current_listeners")
            or "current_listeners" in request.request.arguments
            or request.get_cookie("r4_active_list") == "current_listeners"
        ):
            request.append(
                "current_listeners", cache.get_station(request.sid, "current_listeners")
            )

        request.append("request_line", cache.get_station(request.sid, "request_line"))

    sched_next = []
    sched_history = None
    sched_current = None
    if request.user and not request.user.is_anonymous():
        request.append("requests", request.user.get_requests(request.sid))
        sched_current = cache.get_station(request.sid, "sched_current")
        if not sched_current:
            raise APIException(
                "server_just_started",
                "Rainwave is Rebooting, Please Try Again in a Few Minutes",
                http_code=500,
            )
        if request.user.is_tunedin():
            sched_current.get_song().data["rating_allowed"] = True
        sched_current = sched_current.to_dict(request.user)
        sched_next = []
        sched_next_objects = cast(
            list[BaseEvent], cache.get_station(request.sid, "sched_next")
        )
        for evt in sched_next_objects:
            sched_next.append(evt.to_dict(request.user))
        if (
            len(sched_next) > 0
            and request.user.is_tunedin()
            and sched_next_objects[0].is_election
            and len(sched_next_objects[0].songs) > 1
        ):
            sched_next[0]["voting_allowed"] = True
        if request.user.is_tunedin() and request.user.has_perks():
            for i in range(1, len(sched_next)):
                if (
                    sched_next_objects[i].is_election
                    and len(sched_next_objects[i].songs) > 1
                ):
                    sched_next[i]["voting_allowed"] = True
        sched_history = []
        for evt in cast(
            list[BaseEvent], cache.get_station(request.sid, "sched_history")
        ):
            sched_history.append(evt.to_dict(request.user, check_rating_acl=True))
    elif request.user:
        sched_current = cache.get_station(request.sid, "sched_current_dict")
        if not sched_current:
            raise APIException(
                "server_just_started",
                "Rainwave is Rebooting, Please Try Again in a Few Minutes",
                http_code=500,
            )
        sched_next = cast(list[dict], cache.get_station(request.sid, "sched_next_dict"))
        sched_history = cache.get_station(request.sid, "sched_history_dict")
        if (
            len(sched_next) > 0
            and request.user.is_tunedin()
            and sched_next[0]["type"] == "Election"
            and len(sched_next[0]["songs"]) > 1
        ):
            sched_next[0]["voting_allowed"] = True
    request.append("sched_current", sched_current)
    request.append("sched_next", sched_next)
    request.append("sched_history", sched_history)
    if request.user:
        if not request.user.is_anonymous():
            user_vote_cache = cache.get_user(request.user, "vote_history")
            if user_vote_cache:
                request.append("already_voted", user_vote_cache)
        else:
            if (
                len(sched_next) > 0
                and request.user.data.get("voted_entry")
                and request.user.data.get("voted_entry") > 0  # type: ignore
                and request.user.data["lock_sid"] == request.sid
            ):
                request.append(
                    "already_voted",
                    [(sched_next[0]["id"], request.user.data["voted_entry"])],
                )

    request.append("all_stations_info", cache.get("all_stations_info"))

    if live_voting:
        request.append("live_voting", cache.get_station(request.sid, "live_voting"))
