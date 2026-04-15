export interface listenerDetailContext {
  avatar?: string;
  colour?: string;
  id?: string | number;
  name?: string;
  rank?: string | number;
  regdate?: string | number;
  request_count_listener?: number;
  top_albums?: Array<Record<string, unknown>>;
  top_request_albums?: Array<Record<string, unknown>>;
  user_id?: string | number;
}
