from typing import Literal, TypedDict

from api import rainwave_typeddicts

# Manually maintained, this cannot be auto-generated.


class RainwaveStation(TypedDict):
    id: int
    url: str


class ErrorMessage(TypedDict):
    tk_key: str
    text: str


class ArtistWithSongs(rainwave_typeddicts.Artist):
    all_songs: list[rainwave_typeddicts.SongOnAlbum]


class RainwaveResponse(TypedDict, total=False):
    update_user_nickname_by_discord_id_result: (
        rainwave_typeddicts.UpdateUserNicknameByDiscordIdResult
    )
    update_user_avatar_by_discord_id_result: (
        rainwave_typeddicts.UpdateUserAvatarByDiscordIdResult
    )
    enable_perks_by_discord_ids_result: (
        rainwave_typeddicts.EnablePerksByDiscordIdsResult
    )
    add_donation_result: rainwave_typeddicts.AddDonationResult
    delete_power_hour_result: rainwave_typeddicts.DeletePowerHourResult
    set_song_request_only_result: rainwave_typeddicts.SetSongRequestOnlyResult
    set_song_cooldown_result: rainwave_typeddicts.SetSongCooldownResult
    set_album_cooldown_result: rainwave_typeddicts.SetAlbumCooldownResult
    admin_js_errors: rainwave_typeddicts.AdminJsErrors
    admin_music_scan_errors: rainwave_typeddicts.AdminMusicScanErrors
    admin_power_hour: rainwave_typeddicts.AdminPowerHour
    admin_power_hours: rainwave_typeddicts.AdminPowerHours
    admin_user_search_result: rainwave_typeddicts.AdminUserSearchResult
    album: rainwave_typeddicts.Album
    album_diff: rainwave_typeddicts.AlbumDiff
    albums: rainwave_typeddicts.Albums
    all_albums_paginated: rainwave_typeddicts.AllAlbumsPaginated
    all_artists_paginated: rainwave_typeddicts.AllArtistsPaginated
    all_faves: rainwave_typeddicts.AllFaves
    all_groups_paginated: rainwave_typeddicts.AllGroupsPaginated
    all_songs: rainwave_typeddicts.AllSongs
    all_stations_info: rainwave_typeddicts.AllStationsInfo
    already_voted: rainwave_typeddicts.AlreadyVoted
    api_info: rainwave_typeddicts.ApiInfo
    artists: list[rainwave_typeddicts.SearchArtist]
    artist: rainwave_typeddicts.Artist1
    build_version: rainwave_typeddicts.BuildVersion
    cookie_domain: rainwave_typeddicts.CookieDomain
    delete_request_result: rainwave_typeddicts.DeleteRequestResult
    error_report_result: rainwave_typeddicts.ErrorReportResult
    error: rainwave_typeddicts.Error
    fave_album_result: rainwave_typeddicts.FaveAlbumResult
    fave_all_songs_result: rainwave_typeddicts.FaveAllSongsResult
    fave_song_result: rainwave_typeddicts.FaveSongResult
    group: rainwave_typeddicts.Group
    listener: rainwave_typeddicts.Listener
    live_voting: rainwave_typeddicts.LiveVoting
    locale: rainwave_typeddicts.Locale
    locales: rainwave_typeddicts.Locales
    message_id: rainwave_typeddicts.MessageId
    order_requests_result: rainwave_typeddicts.OrderRequestsResult
    pause_request_queue_result: rainwave_typeddicts.PauseRequestQueueResult
    ping: rainwave_typeddicts.Ping
    pong: rainwave_typeddicts.Pong
    pongConfirm: rainwave_typeddicts.PongConfirm
    power_hours: rainwave_typeddicts.PowerHours
    playback_history: rainwave_typeddicts.PlaybackHistory
    rate_result: rainwave_typeddicts.RateResult
    redownload_m3u: rainwave_typeddicts.RedownloadM3u
    relays: rainwave_typeddicts.Relays
    request_favorited_songs_result: rainwave_typeddicts.RequestFavoritedSongsResult
    request_line: rainwave_typeddicts.RequestLine
    request_result: rainwave_typeddicts.RequestResult
    request_unrated_songs_result: rainwave_typeddicts.RequestUnratedSongsResult
    requests: rainwave_typeddicts.Requests
    sched_current: rainwave_typeddicts.SchedCurrent
    sched_history: rainwave_typeddicts.SchedHistory
    sched_next: rainwave_typeddicts.SchedNext
    song: rainwave_typeddicts.Song
    songs: list[rainwave_typeddicts.SearchSong]
    station_list: rainwave_typeddicts.StationList
    station_song_count: rainwave_typeddicts.StationSongCount
    stations: rainwave_typeddicts.Stations
    stream_filename: rainwave_typeddicts.StreamFilename
    sync_result: rainwave_typeddicts.SyncResult
    tip_jar: rainwave_typeddicts.TipJar
    top_100: rainwave_typeddicts.Top100
    unpause_request_queue_result: rainwave_typeddicts.UnpauseRequestQueueResult
    unrated_songs: rainwave_typeddicts.UnratedSongs
    user_info: rainwave_typeddicts.UserInfo
    user_recent_votes: rainwave_typeddicts.UserRecentVotes
    user_requested_history: rainwave_typeddicts.UserRequestedHistory
    user: rainwave_typeddicts.User
    vote_result: rainwave_typeddicts.VoteResult
    websocket_host: rainwave_typeddicts.WebsocketHost
    wsok: rainwave_typeddicts.Wsok
    wsthrottle: rainwave_typeddicts.Wsthrottle
    wserror: rainwave_typeddicts.Wserror


RainwaveResponseKey = Literal[
    "admin_js_errors",
    "admin_music_scan_errors",
    "admin_power_hour",
    "admin_power_hours",
    "admin_user_search_result",
    "album",
    "album_diff",
    "albums",
    "all_albums_paginated",
    "all_artists_paginated",
    "all_faves",
    "all_groups_paginated",
    "all_songs",
    "all_stations_info",
    "already_voted",
    "api_info",
    "artists",
    "artist",
    "build_version",
    "cookie_domain",
    "delete_request_result",
    "error_report_result",
    "error",
    "fave_album_result",
    "fave_all_songs_result",
    "fave_song_result",
    "group",
    "listener",
    "live_voting",
    "locale",
    "locales",
    "message_id",
    "order_requests_result",
    "pause_request_queue_result",
    "ping",
    "pong",
    "pongConfirm",
    "playback_history",
    "power_hours",
    "rate_result",
    "redownload_m3u",
    "relays",
    "request_favorited_songs_result",
    "request_line",
    "request_result",
    "request_unrated_songs_result",
    "requests",
    "sched_current",
    "sched_history",
    "sched_next",
    "song",
    "songs",
    "station_list",
    "station_song_count",
    "stations",
    "stream_filename",
    "sync_result",
    "tip_jar",
    "top_100",
    "unpause_request_queue_result",
    "unrated_songs",
    "user_info",
    "user_recent_votes",
    "user_requested_history",
    "user",
    "vote_result",
    "websocket_host",
    "wsok",
    "wsthrottle",
    "wserror",
    "update_user_nickname_by_discord_id_result",
    "update_user_avatar_by_discord_id_result",
    "enable_perks_by_discord_ids_result",
    "add_donation_result",
    "delete_power_hour_result",
    "set_song_request_only_result",
    "set_song_cooldown_result",
    "set_album_cooldown_result",
]


class BootstrapUser(rainwave_typeddicts.User):
    api_key: str


class RainwaveBootstrapResponse(TypedDict):
    all_stations_info: rainwave_typeddicts.AllStationsInfo
    already_voted: rainwave_typeddicts.AlreadyVoted
    api_info: rainwave_typeddicts.ApiInfo
    build_version: int
    cookie_domain: str
    live_voting: rainwave_typeddicts.LiveVoting
    locale: rainwave_typeddicts.Locale
    locales: rainwave_typeddicts.Locales
    mobile: bool
    relays: rainwave_typeddicts.Relays
    request_line: rainwave_typeddicts.RequestLine
    requests: rainwave_typeddicts.Requests
    sched_current: rainwave_typeddicts.SchedCurrent
    sched_history: rainwave_typeddicts.SchedHistory
    sched_next: rainwave_typeddicts.SchedNext
    station_list: rainwave_typeddicts.StationList
    stream_filename: rainwave_typeddicts.StreamFilename
    user: BootstrapUser
    websocket_host: str
