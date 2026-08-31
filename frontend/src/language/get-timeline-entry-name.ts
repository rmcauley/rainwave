import { $l } from '.';
import type { TimelineEntry } from '../rainwaveApi/types';
import { translation } from './translations';
import type { RainwaveTranslationKey } from './translations';

function getTimelineEntryName(timelineEntry: TimelineEntry): string {
  if (
    timelineEntry.type != 'Election' &&
    timelineEntry.name &&
    `event_naming__${timelineEntry.type.toLowerCase()}` in translation
  ) {
    return $l(`event_naming__${timelineEntry.type.toLowerCase()}` as RainwaveTranslationKey, {
      name: timelineEntry.name,
    });
  }

  return timelineEntry.name || timelineEntry.type;
}

export { getTimelineEntryName };
