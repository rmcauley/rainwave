import type { components } from '../../../rainwaveApi/rainwave-openapi';

export interface listenerPanelContext {
  listener: components['schemas']['listener'];
  isSelf: boolean;
  registrationYear: number;
}
