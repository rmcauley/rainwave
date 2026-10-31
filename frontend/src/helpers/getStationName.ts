import { $l } from '../language';
import type { RainwaveTranslationKey } from '../language/translations';

function getStationName(sid: number | string): string {
  return $l(`station_name_${sid}` as RainwaveTranslationKey);
}

export { getStationName };
