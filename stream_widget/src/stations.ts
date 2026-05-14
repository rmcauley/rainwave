import type { Station } from './types';

interface StationsResponse {
  stations: Station[];
}

const FALLBACK_STATIONS: Station[] = [
  { id: 5, name: 'All', description: '', stream: '', relays: [] },
  { id: 1, name: 'Game', description: '', stream: '', relays: [] },
  { id: 2, name: 'OverClocked ReMix', description: '', stream: '', relays: [] },
  { id: 3, name: 'Covers', description: '', stream: '', relays: [] },
  { id: 4, name: 'Chiptune', description: '', stream: '', relays: [] },
];

async function fetchStations(fetchImpl: typeof fetch = fetch): Promise<Station[]> {
  const response = await fetchImpl('/api4/stations', {
    method: 'POST',
    headers: {
      accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Station fetch failed with ${response.status}`);
  }

  const payload = (await response.json()) as Partial<StationsResponse>;

  return payload.stations || [];
}

export { FALLBACK_STATIONS, fetchStations };
