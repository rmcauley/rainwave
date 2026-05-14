import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from './config';
import { NO_ART_URL, buildAlbumArtUrl, nowPlayingFromSchedule } from './nowPlaying';

import type { TimelineEntry } from './types';

const SAMPLE_ENTRY = {
  id: 99,
  songs: [
    {
      id: 12,
      title: 'The Track',
      albums: [
        {
          name: 'The Album',
          art: 'static/album_art/abc',
        },
      ],
      artists: [
        { id: 2, name: 'Second', order: 1 },
        { id: 1, name: 'First', order: 0 },
      ],
      elec_request_username: 'Requester',
    },
  ],
} as unknown as TimelineEntry;

describe('now playing mapping', () => {
  it('builds album art URLs with fallback support', () => {
    expect(buildAlbumArtUrl(null)).toBe(NO_ART_URL);
    expect(buildAlbumArtUrl('static/album_art/abc')).toBe(
      'https://rainwave.cc/static/album_art/abc_320.jpg',
    );
  });

  it('maps schedule payloads to display data', () => {
    const nowPlaying = nowPlayingFromSchedule(SAMPLE_ENTRY, DEFAULT_CONFIG);

    expect(nowPlaying?.title).toBe('The Track');
    expect(nowPlaying?.album).toBe('The Album');
    expect(nowPlaying?.artist).toBe('First, Second');
    expect(nowPlaying?.requester).toBe('Requester');
  });

  it('hides requester attribution when disabled', () => {
    const nowPlaying = nowPlayingFromSchedule(SAMPLE_ENTRY, {
      ...DEFAULT_CONFIG,
      showRequesters: false,
    });

    expect(nowPlaying?.requester).toBeNull();
  });
});
