from typing import TypedDict

from api import rainwave_openapi

# Manually maintained, this cannot be auto-generated.


class RainwaveStation(TypedDict):
    id: int
    url: str


class ErrorMessage(TypedDict):
    tk_key: str
    text: str


class ArtistWithSongs(rainwave_openapi.Artist):
    all_songs: list[rainwave_openapi.SongOnAlbum]


class RainwaveResponseTypes(TypedDict):
    album: rainwave_openapi.AlbumWithDetail
    album_diff: rainwave_openapi.AlbumDiff
    albums: list[rainwave_openapi.SearchAlbum]
    all_albums_paginated: rainwave_openapi.AllAlbumsPaginated
    all_artists_paginated: rainwave_openapi.AllArtistsPaginated
    all_faves: list[rainwave_openapi.FaveSong]
    all_groups_paginated: rainwave_openapi.AllGroupsPaginated
    all_songs: list[rainwave_openapi.AllSongsSong]
    all_stations_info: rainwave_openapi.AllStationsInfo
    already_voted: rainwave_openapi.AlreadyVoted
    api_info: rainwave_openapi.ApiInfo
    artists: rainwave_openapi.SearchArtist
    artist: list[ArtistWithSongs]
    build_version: int
    cookie_domain: str
    delete_request_result: rainwave_openapi.BooleanResult
    error_report_result: rainwave_openapi.BooleanResult
    error: rainwave_openapi.RainwaveErrorObject
    fave_album_result: rainwave_openapi.FaveAlbumResult
    fave_all_songs_result: rainwave_openapi.FaveAllSongsResult
    fave_song_result: rainwave_openapi.FaveSongResult
    group: rainwave_openapi.GroupWithDetail
    listener: rainwave_openapi.Listener
    live_voting: rainwave_openapi.LiveVoting
    locale: str
    locales: dict[str, str]
    message_id: rainwave_openapi.MessageId
    mobile: bool
    order_requests_result: rainwave_openapi.BooleanResult
    pause_request_queue_result: rainwave_openapi.BooleanResult
    ping: rainwave_openapi.Ping
    pong: rainwave_openapi.Pong
    pongConfirm: rainwave_openapi.PongConfirm
    playback_history: rainwave_openapi.PlaybackHistory
    rate_result: rainwave_openapi.RateResult
    redownload_m3u: rainwave_openapi.RedownloadM3u
    relays: rainwave_openapi.Relays
    request_favorited_songs_result: rainwave_openapi.BooleanResult
    request_line: rainwave_openapi.RequestLine
    request_result: rainwave_openapi.BooleanResult
    request_unrated_songs_result: rainwave_openapi.BooleanResult
    requests: rainwave_openapi.Requests
    sched_current: rainwave_openapi.SchedCurrent
    sched_history: rainwave_openapi.SchedHistory
    sched_next: rainwave_openapi.SchedNext
    song: rainwave_openapi.SongWithDetail
    songs: rainwave_openapi.SearchSong
    station_list: dict[int, RainwaveStation]
    station_song_count: rainwave_openapi.StationSongCount
    stations: rainwave_openapi.Stations
    stream_filename: str
    sync_result: rainwave_openapi.RainwaveErrorObject
    top_100: rainwave_openapi.Top100
    unpause_request_queue_result: rainwave_openapi.BooleanResult
    unrated_songs: rainwave_openapi.UnratedSongs
    user_info: rainwave_openapi.User
    user_recent_votes: rainwave_openapi.UserRecentVotes
    user_requested_history: rainwave_openapi.UserRecentVotes
    user: rainwave_openapi.User
    vote_result: rainwave_openapi.VoteResult
    websocket_host: str
    wsok: bool
    wsthrottle: ErrorMessage
    wserror: rainwave_openapi.RainwaveErrorObject


class BootstrapUser(rainwave_openapi.User):
    api_key: str


class RainwaveBootstrapResponse(TypedDict):
    all_stations_info: rainwave_openapi.AllStationsInfo
    already_voted: rainwave_openapi.AlreadyVoted
    api_info: rainwave_openapi.ApiInfo
    build_version: int
    cookie_domain: str
    live_voting: rainwave_openapi.LiveVoting
    locale: rainwave_openapi.Locale
    locales: rainwave_openapi.Locales
    mobile: bool
    relays: rainwave_openapi.Relays
    request_line: rainwave_openapi.RequestLine
    requests: rainwave_openapi.Requests
    sched_current: rainwave_openapi.SchedCurrent
    sched_history: rainwave_openapi.SchedHistory
    sched_next: rainwave_openapi.SchedNext
    station_list: rainwave_openapi.StationList
    stream_filename: rainwave_openapi.StreamFilename
    user: BootstrapUser
    websocket_host: str
