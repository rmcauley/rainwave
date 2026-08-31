import { describe, expect, it } from 'vitest';

import { fetchStations } from './stations';

describe('station fetching', () => {
  it('fetches unauthenticated station metadata from /api4/stations', async () => {
    const calls: RequestInit[] = [];
    const fakeFetch = async (
      _url: string | URL | Request,
      init?: RequestInit,
    ): Promise<Response> => {
      calls.push(init || {});

      return new Response(JSON.stringify({ stations: [{ id: 5, name: 'All' }] }), {
        status: 200,
      });
    };

    const stations = await fetchStations(fakeFetch as typeof fetch);

    expect(stations).toEqual([{ id: 5, name: 'All' }]);
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers).toEqual({ accept: 'application/json' });
  });
});
