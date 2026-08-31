import { api } from '../rainwaveApi';
import type { RainwaveSchemas } from '../rainwaveApi/types';

function calculateTimeDiff(apiInfo: RainwaveSchemas['api_info']): number {
  return apiInfo.time - Math.round(new Date().getTime() / 1000) + 2;
}

// Time difference to server
let timeDiff = 0;

function getServerTime(): number {
  return Math.round(new Date().getTime() / 1000) + timeDiff;
}

function resync(apiInfo: RainwaveSchemas['api_info']): void {
  timeDiff = calculateTimeDiff(apiInfo);
}

api.addEventListener('api_info', resync);

export { getServerTime };
