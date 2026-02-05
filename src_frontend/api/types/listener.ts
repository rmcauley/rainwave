import type { Station } from './station';
import type { RainwaveTime } from './time';

export interface ListenerTopAlbum {
  id: number;
  name: string;
  rating_listener: number;
  rating: number;
}

export interface ListenerTopRequestAlbum {
  id: number;
  name: string;
  request_count_listener: number;
}

export interface ListenerVotesByStation {
  sid: Station;
  votes: number;
}

export interface ListenerRequestsByStation {
  sid: Station;
  requests: number;
}

export interface ListenerRatingsByStation {
  sid: Station;
  average_rating: string;
  ratings: number;
}

export interface ListenerRatingSpreadItem {
  ratings: number;
  rating: number;
}

export interface Listener {
  user_id: number;
  name: string;
  avatar: string | null;
  colour: string;
  rank: string;
  /** @deprecated */
  total_votes: number;
  /** @deprecated */
  total_ratings: number;
  /** @deprecated */
  mind_changes: number;
  /** @deprecated */
  total_requests: number;
  /** @deprecated */
  winning_votes: number;
  /** @deprecated */
  losing_votes: number;
  regdate: RainwaveTime;
  top_albums: ListenerTopAlbum[];
  top_request_albums: ListenerTopRequestAlbum[];
  votes_by_station: ListenerVotesByStation[];
  requests_by_station: ListenerRequestsByStation[];
  requests_by_source_station: ListenerRequestsByStation[];
  ratings_by_station: ListenerRatingsByStation[];
  ratings_completion: { [K in Exclude<Station, Station.all>]?: number };
  rating_spread: ListenerRatingSpreadItem[];
}
