import { api } from '../rainwaveApi';

import type { RainwaveSchemas } from '../rainwaveApi/types';

function calculateTimeDiff(json: RainwaveSchemas['api_info']): number {
  return json.time - Math.round(new Date().getTime() / 1000) + 2;
}

// Time difference to server
let timeDiff = calculateTimeDiff(bootstrap.api_info);

function getServerTime(): number {
  return Math.round(new Date().getTime() / 1000) + timeDiff;
}

function resync(json: RainwaveSchemas['api_info']): void {
  timeDiff = calculateTimeDiff(json);
}

api.addEventListener('api_info', resync);

export { getServerTime };
