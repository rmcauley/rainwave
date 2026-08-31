import { RainwaveError } from '../../frontend/src/rainwaveApi/errors';
import { RainwaveApi } from '../../frontend/src/rainwaveApi/rainwave';
import type { BootstrapPayload, TimelineEntry, WidgetConfig } from './types';

async function fetchBootstrap(fetchImpl: typeof fetch = fetch): Promise<BootstrapPayload> {
  const response = await fetchImpl('/api4/bootstrap', {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Bootstrap fetch failed with ${response.status}`);
  }

  return (await response.json()) as BootstrapPayload;
}

interface StartRainwaveSyncOptions {
  config: WidgetConfig;
  onCurrent: (entry: TimelineEntry) => void;
  onError: (message: string) => void;
  reload: () => void;
}

async function startRainwaveSync(options: StartRainwaveSyncOptions): Promise<RainwaveApi> {
  const bootstrap = await fetchBootstrap();
  const api = new RainwaveApi();
  api.setOptions({
    apiKey: bootstrap.user.api_key,
    sid: options.config.sid,
    userId: 1,
  });
  api.addEventListener('sched_current', options.onCurrent);
  api.addEventListener('error', (error) => {
    options.onError(error.text || error.tl_key);
  });

  try {
    await api.startWebSocketSync();
  } catch (error) {
    if (error instanceof RainwaveError && error.key === 'auth_failed') {
      options.reload();

      return api;
    }
    throw error;
  }

  return api;
}

export { fetchBootstrap, startRainwaveSync };
