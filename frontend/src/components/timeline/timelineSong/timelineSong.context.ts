export interface timelineSongContext {
  _is_timeline?: boolean;
  artists?: Array<Record<string, unknown>>;
  elec_request_user_id?: string | number;
  elec_request_username?: string;
  entry_id?: string | number;
  id?: string | number;
  link_text?: string;
  name?: string;
  origin_sid?: string | number;
  request_id?: string | number;
  title?: string;
  url?: string;
}
