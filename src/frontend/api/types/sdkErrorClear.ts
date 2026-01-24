import type { RainwaveErrorObject } from './rainwaveErrorObject';

/**
 * This event is emitted with the same `tl_key` as a {@RainwaveError}
 * in order to clear error states.  One example is the `sync_retrying`
 * error which occurs when the websocket has been disconnected.
 */
export interface RainwaveSDKErrorClear {
  tl_key: RainwaveErrorObject['tl_key'];
}
