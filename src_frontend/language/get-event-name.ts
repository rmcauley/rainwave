import { $l } from '.';

import { translation } from './translations';

import type { RainwaveTranslationKey } from './translations';
import type { RainwaveEvent } from '../api/types';

function getEventName(event: RainwaveEvent): string {
  if (
    event.type != 'Election' &&
    event.name &&
    'event_naming__' + event.type.toLowerCase() in translation
  ) {
    return $l(('event_naming__' + event.type.toLowerCase()) as RainwaveTranslationKey, {
      name: event.name,
    });
  }

  return event.name || event.type;
}

export { getEventName };
