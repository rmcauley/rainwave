import { api } from '../api';

import type { RainwaveResponseTypes } from '../api/responseTypes';

function calculateTimeDiff(json: RainwaveResponseTypes['api_info']): number {
  return json.time - Math.round(new Date().getTime() / 1000) + 2;
}

// Time difference to server
let timeDiff = calculateTimeDiff(bootstrap.api_info);

function getServerTime(): number {
  return Math.round(new Date().getTime() / 1000) + timeDiff;
}

function resync(json: RainwaveResponseTypes['api_info']): void {
  timeDiff = calculateTimeDiff(json);
}

api.addEventListener('api_info', resync);

export { getServerTime };
