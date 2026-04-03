import { $l } from '.';

import { translation } from './translations';

import type { RainwaveTranslationKey } from './translations';
import type { TimelineEntry } from '../rainwaveApi/types';

function getTimelineEntryName(timelineEntry: TimelineEntry): string {
  if (
    timelineEntry.type != 'Election' &&
    timelineEntry.name &&
    'event_naming__' + timelineEntry.type.toLowerCase() in translation
  ) {
    return $l(('event_naming__' + timelineEntry.type.toLowerCase()) as RainwaveTranslationKey, {
      name: timelineEntry.name,
    });
  }

  return timelineEntry.name || timelineEntry.type;
}

export { getTimelineEntryName };
