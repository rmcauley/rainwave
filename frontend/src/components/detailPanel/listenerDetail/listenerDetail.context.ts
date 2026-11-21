import type { components } from '../../../rainwaveApi/rainwave-openapi';

export interface listenerDetailContext {
  listener: components['schemas']['listener'];
  isSelf: boolean;
  registrationYear: number;
}
