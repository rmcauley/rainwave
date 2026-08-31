import { DateTime } from 'luxon';

const TORONTO_ZONE = 'America/Toronto';
const LONDON_ZONE = 'Europe/London';

function formatInZone(epochSeconds: number | null, zone: string): string {
  if (!epochSeconds) {
    return 'Not set';
  }

  return DateTime.fromSeconds(epochSeconds, { zone: 'utc' })
    .setZone(zone)
    .toFormat('yyyy-LL-dd HH:mm ZZZZ');
}

export function formatPowerHourTimes(epochSeconds: number | null): {
  browser: string;
  toronto: string;
  london: string;
} {
  return {
    browser: formatInZone(epochSeconds, DateTime.local().zoneName),
    toronto: formatInZone(epochSeconds, TORONTO_ZONE),
    london: formatInZone(epochSeconds, LONDON_ZONE),
  };
}
