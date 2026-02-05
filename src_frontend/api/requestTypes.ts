import type { RainwaveResponseTypes } from './responseTypes';
import type { AllSongsRequestParams, RainwavePagedParams, ValidatedSongRatingUser } from './types';

interface BaseRequest {
  response: unknown;
  params: Record<string, unknown>;
}

interface AlbumRequest extends BaseRequest {
  response: { album: RainwaveResponseTypes['album'] };
  params: {
    /** ID of album to load from API. */
    id: number;
    /**
     * How songs in the album will be sorted.
     * - `undefined | null`: alphabetically.
     * - `added_on`: when song was added to Rainwave.
     * */
    sort?: 'added_on';
  };
}

interface AllAlbumsPaginatedRequest extends BaseRequest {
  params: { after?: number };
  response: { all_albums_paginated: RainwaveResponseTypes['all_albums_paginated'] };
}

interface AllArtistsPaginatedRequest extends BaseRequest {
  params: { after?: number };
  response: { all_artists_paginated: RainwaveResponseTypes['all_artists_paginated'] };
}

interface AllFavesRequest extends BaseRequest {
  response: { all_faves: RainwaveResponseTypes['all_faves'] };
  params: RainwavePagedParams;
}

interface AllGroupsPaginatedRequest extends BaseRequest {
  params: { after?: number };
  response: { all_groups_paginated: RainwaveResponseTypes['all_groups_paginated'] };
}

interface AllSongsRequest extends BaseRequest {
  response: { all_songs: RainwaveResponseTypes['all_songs'] };
  params: AllSongsRequestParams;
}

interface ArtistRequest extends BaseRequest {
  response: { artist: RainwaveResponseTypes['artist'] };
  params: {
    /** ID of Artist to load from the API. */
    id: number;
  };
}

interface AuthRequest extends BaseRequest {
  response: {
    wsok?: RainwaveResponseTypes['wsok'];
    wserror?: RainwaveResponseTypes['wserror'];
  };
  params: {
    /** ID of User to authenticate as. */
    user_id: number;
    /** API key obtained through auth flow. */
    key: string;
  };
}

interface CheckSchedCurrentId extends BaseRequest {
  response: Record<string, never>;
  params: {
    /** Last {@link RainwaveEvent} ID that you have last seen. */
    sched_id: number;
  };
}

interface ClearRatingRequest extends BaseRequest {
  response: { rate_result: RainwaveResponseTypes['rate_result'] };
  params: {
    /** Song ID of rating to clear. */
    song_id: number;
  };
}

interface ClearRequestsRequest extends BaseRequest {
  response: { requests: RainwaveResponseTypes['requests'] };
}

interface ClearRequestsOnCooldownRequest extends BaseRequest {
  response: {
    requests: RainwaveResponseTypes['requests'];
  };
}

interface DeleteRequestRequest extends BaseRequest {
  response: { requests: RainwaveResponseTypes['requests'] };
  params: {
    /** ID of Song in user's RequestQueue to delete. */
    song_id: number;
  };
}

interface FaveAlbumRequest extends BaseRequest {
  response: { fave_album_result: RainwaveResponseTypes['fave_album_result'] };
  params: {
    /** ID of Album to update. */
    album_id: number;
    /** `true` to set album as a fave, `false` to un-fave. */
    fave: boolean;
  };
}

interface FaveAllSongsRequest extends BaseRequest {
  response: { fave_all_songs_result: RainwaveResponseTypes['fave_all_songs_result'] };
  params: {
    /** ID of Album to update.  All songs in this Album will be updated. */
    album_id: number;
    /** `true` to set all Songs in the Album as faves, `false` to un-fave all Songs in the Album. */
    fave: boolean;
  };
}

interface FaveSongRequest extends BaseRequest {
  response: { fave_song_result: RainwaveResponseTypes['fave_song_result'] };
  params: {
    /** ID of Song to update. */
    song_id: number;
    /** `true` to set Song as a fave, `false` to un-fave. */
    fave: boolean;
  };
}

interface GroupRequest extends BaseRequest {
  response: { group: RainwaveResponseTypes['group'] };
  params: {
    /** ID of Group to load.  */
    id: number;
  };
}

interface InfoAllRequest extends BaseRequest {
  response: { all_stations_info: RainwaveResponseTypes['all_stations_info'] };
}

interface ListenerRequest extends BaseRequest {
  response: { listener: RainwaveResponseTypes['listener'] };
  params: {
    /** ID of User to load. */
    id: number;
  };
}

interface OrderRequestsRequest extends BaseRequest {
  response: {
    order_requests_result: RainwaveResponseTypes['order_requests_result'];
    requests: RainwaveResponseTypes['requests'];
  };
  params: {
    /** Ordered array of all Song IDs in User's Requests that will determine the new order.  String of numerics separated by commas. */
    order: string;
  };
}

interface PauseRequestQueueRequest extends BaseRequest {
  response: {
    pause_request_queue_result: RainwaveResponseTypes['pause_request_queue_result'];
    user: RainwaveResponseTypes['user'];
  };
}

interface PingRequest extends BaseRequest {
  response: { pong: RainwaveResponseTypes['pong'] };
}

interface PongRequest extends BaseRequest {
  response: {
    pongConfirm: RainwaveResponseTypes['pongConfirm'];
  };
}

interface PlaybackHistoryRequest extends BaseRequest {
  response: { playback_history: RainwaveResponseTypes['playback_history'] };
  params: RainwavePagedParams;
}

interface RateRequest extends BaseRequest {
  response: { rate_result: RainwaveResponseTypes['rate_result'] };
  params: {
    /** ID of Song to rate. */
    song_id: number;
    /** Rating to set the song to.  Recommended to use {@link getValidatedRatingUser}. */
    rating: ValidatedSongRatingUser;
  };
}

interface RequestRequest extends BaseRequest {
  response: { requests: RainwaveResponseTypes['requests'] };
  params: {
    /** ID of Song to request. */
    song_id: number;
  };
}

interface RequestFavoritedSongsRequest extends BaseRequest {
  response: {
    request_favorited_songs_result: RainwaveResponseTypes['request_favorited_songs_result'];
    requests: RainwaveResponseTypes['requests'];
  };
  params: {
    /** Maximum number of songs to add to user's request queue.  Not providing this will fill the entire user's request queue. */
    limit?: number;
  };
}

interface RequestLineRequest extends BaseRequest {
  response: { request_line_result: RainwaveResponseTypes['request_line'] };
}

interface RequestUnratedSongsRequest extends BaseRequest {
  response: {
    request_unrated_songs_result: RainwaveResponseTypes['request_unrated_songs_result'];
    requests: RainwaveResponseTypes['requests'];
  };
  params: {
    /** Maximum number of songs to add to user's request queue.  Not providing this will fill the entire user's request queue. */
    limit?: number;
  };
}

interface SearchRequest extends BaseRequest {
  response: {
    albums: RainwaveResponseTypes['albums'];
    artists: RainwaveResponseTypes['artists'];
    songs: RainwaveResponseTypes['songs'];
  };
  params: {
    /** Term to search for.  Must be three letters or longer. */
    search: string;
  };
}

interface SongRequest extends BaseRequest {
  response: { song: RainwaveResponseTypes['song'] };
  params: {
    /** ID of Song to load from API. */
    id: number;
  };
}

interface StationSongCountRequest extends BaseRequest {
  response: {
    station_song_count: RainwaveResponseTypes['station_song_count'];
  };
}

interface StationsRequest extends BaseRequest {
  response: { stations: RainwaveResponseTypes['stations'] };
}

interface Top100Request extends BaseRequest {
  response: { top_100: RainwaveResponseTypes['top_100'] };
}

interface UnpauseRequestQueueRequest extends BaseRequest {
  response: {
    unpause_request_queue_result: RainwaveResponseTypes['unpause_request_queue_result'];
    user: RainwaveResponseTypes['user'];
  };
}

interface UnratedSongsRequest extends BaseRequest {
  response: { unrated_songs: RainwaveResponseTypes['unrated_songs'] };
  params: RainwavePagedParams;
}

interface UserInfoRequest extends BaseRequest {
  response: { user_info: RainwaveResponseTypes['user'] };
}

interface UserRecentVotesRequest extends BaseRequest {
  response: { user_recent_votes: RainwaveResponseTypes['user_recent_votes'] };
  params: RainwavePagedParams;
}

interface UserRequestedHistoryRequest extends BaseRequest {
  response: {
    user_requested_history: RainwaveResponseTypes['user_requested_history'];
  };
  params: RainwavePagedParams;
}

interface VoteRequest extends BaseRequest {
  response: { vote: RainwaveResponseTypes['vote_result'] };
  params: {
    /** Entry ID of {@link RainwaveEventSong} to vote for. */
    entry_id: number;
  };
}

interface RainwaveRequests extends Record<string, BaseRequest> {
  album: AlbumRequest;
  all_albums_paginated: AllAlbumsPaginatedRequest;
  all_artists_paginated: AllArtistsPaginatedRequest;
  all_faves: AllFavesRequest;
  all_groups_paginated: AllGroupsPaginatedRequest;
  all_songs: AllSongsRequest;
  artist: ArtistRequest;
  auth: AuthRequest;
  check_sched_current_id: CheckSchedCurrentId;
  clear_rating: ClearRatingRequest;
  clear_requests: ClearRequestsRequest;
  clear_requests_on_cooldown: ClearRequestsOnCooldownRequest;
  delete_request: DeleteRequestRequest;
  fave_album: FaveAlbumRequest;
  fave_all_songs: FaveAllSongsRequest;
  fave_song: FaveSongRequest;
  group: GroupRequest;
  info_all: InfoAllRequest;
  listener: ListenerRequest;
  order_requests: OrderRequestsRequest;
  pause_request_queue: PauseRequestQueueRequest;
  ping: PingRequest;
  pong: PongRequest;
  playback_history: PlaybackHistoryRequest;
  rate: RateRequest;
  request: RequestRequest;
  request_favorited_songs: RequestFavoritedSongsRequest;
  request_line: RequestLineRequest;
  request_unrated_songs: RequestUnratedSongsRequest;
  search: SearchRequest;
  song: SongRequest;
  station_song_count: StationSongCountRequest;
  stations: StationsRequest;
  top_100: Top100Request;
  unpause_request_queue: UnpauseRequestQueueRequest;
  unrated_songs: UnratedSongsRequest;
  user_info: UserInfoRequest;
  user_recent_votes: UserRecentVotesRequest;
  user_requested_history: UserRequestedHistoryRequest;
  vote: VoteRequest;
}

export type { RainwaveRequests };
