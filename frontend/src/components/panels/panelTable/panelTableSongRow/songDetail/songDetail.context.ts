import type { components } from '../../../../../rainwaveApi/rainwave-openapi';

export interface songDetailContext {
  artists: components['schemas']['song']['artists'];
  groups: components['schemas']['song']['groups'];
  ratingDetailText: string | null;
}
