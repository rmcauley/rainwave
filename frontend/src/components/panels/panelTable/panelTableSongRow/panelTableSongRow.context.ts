import type { components } from '../../../../rainwaveApi/rainwave-openapi';

export interface panelTableSongRowContext {
  song: Omit<components['schemas']['album']['songs'][number], 'artist_parseable'> & {
    artist_parseable?: components['schemas']['album']['songs'][number]['artist_parseable'];
  };
  showRatingClear: boolean;
  power: boolean;
  artists?: Array<components['schemas']['_artist']>;
}
