import type { components } from '../../../rainwaveApi/rainwave-openapi';

export interface panelSongsTableRowContext {
  song: components['schemas']['album']['songs'][number];
  showRatingClear: boolean;
  power: boolean;
  artists: Array<components['schemas']['_artist']>;
}
