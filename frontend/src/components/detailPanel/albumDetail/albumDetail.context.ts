import type { api } from '../../../rainwaveApi/api';
import type { components } from '../../../rainwaveApi/rainwave-openapi';

type albumDetailContext = {
  album: components['schemas']['album'];
  isNew: boolean;
  hasNewSongs: boolean;
  isAllOnCooldown: boolean;
  hasCooldown: boolean;
  user: typeof api.user;
  ratingPercentileMessage: string;
  showGenres: boolean;
};

export type { albumDetailContext };
