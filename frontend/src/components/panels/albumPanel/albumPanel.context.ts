import type { api } from '../../../rainwaveApi/api';
import type { components } from '../../../rainwaveApi/rainwave-openapi';

export type albumPanelContext = {
  album: components['schemas']['album'];
  isNew: boolean;
  hasNewSongs: boolean;
  isAllOnCooldown: boolean;
  hasCooldown: boolean;
  user: typeof api.user;
  ratingPercentileMessage: string;
};
