export interface songDetailContext {
  artists?: Array<Record<string, unknown>>;
  groups?: Array<Record<string, unknown>>;
  id?: string | number;
  name?: string;
  rating?: string | number;
  rating_count?: number;
  rating_percentile_message?: string;
  rating_rank_percentile?: string | number;
}
