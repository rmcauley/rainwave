import type { components } from '../../rainwaveApi/rainwave-openapi';

export interface songContext {
  electionRequestUserId?: number | null;
  electionRequestUserName?: string | null;
  electionIsOwnRequest?: boolean;
  userId: number;
  sid: number;
  isRequestPanel: boolean;
  isTimeline: boolean;
  isPowerUserMode: boolean;
  song:
    | components['schemas']['sched_current']['songs'][number]
    | components['schemas']['requests'][number];
}
