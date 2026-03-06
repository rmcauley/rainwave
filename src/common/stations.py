from common import config


station_ids: set[int] = set(k for k in config.stations.keys())
station_id_friendly: dict[int, str] = {
    sid: v["name"] for (sid, v) in config.stations.items()
}

station_mount_filenames = {
    sid: v["stream_filename"] for (sid, v) in config.stations.items()
}
stream_filename_to_sid: dict[str, int] = {
    v["stream_filename"]: sid for (sid, v) in config.stations.items()
}
