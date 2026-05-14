import { hasWidgetParams, parseConfig } from './config';
import { initBuilder } from './builder';
import { OverlayRenderer } from './overlay';
import { startRainwaveSync } from './rainwave';

import './index.css';

async function init(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) {
    throw new Error('Missing #app root.');
  }

  const params = new URLSearchParams(window.location.search);
  if (!hasWidgetParams(params) || params.get('builder') === 'true') {
    await initBuilder(root);

    return;
  }

  const config = parseConfig(params);
  const renderer = new OverlayRenderer(root, config);
  renderer.showStatus('Connecting...');
  try {
    await startRainwaveSync({
      config,
      onCurrent: (entry) => {
        renderer.showSchedule(entry);
      },
      onError: (message) => {
        renderer.showStatus(message);
      },
      reload: () => {
        window.location.reload();
      },
    });
  } catch (_error) {
    renderer.showStatus('Unable to connect.');
  }
}

void init();
