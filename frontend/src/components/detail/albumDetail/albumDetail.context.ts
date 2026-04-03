export interface albumDetailContext {
  all_cooldown?: string | number;
  genres?: Array<Record<string, unknown>>;
  has_cooldown?: boolean;
  id?: string | number;
  name?: string;
  new_indicator?: string;
  new_indicator_class?: string;
  rating?: string | number;
  rating_count?: number;
  rating_percentile_message?: string;
  rating_rank_percentile?: string | number;
  rating_user?: string | number;
}
