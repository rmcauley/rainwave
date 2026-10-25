import type { components } from '../../../rainwaveApi/rainwave-openapi';

export interface panelSongTableRowContext {
  song: components['schemas']['album']['songs'][number];
  showCooldown: boolean;
  showRatingClear: boolean;
  showRatingNumber: boolean;
  showArtists: boolean;
  showLinks: boolean;
}
