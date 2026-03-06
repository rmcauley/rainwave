from api import rainwave_typeddicts


def is_api_timeline_entry_an_election(
    timeline_entry: rainwave_typeddicts.TimelineEntry,
) -> bool:
    return (
        timeline_entry["type"] == "Election" or timeline_entry["type"] == "PVPElection"
    )
