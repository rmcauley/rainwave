import type { NowPlaying, TimelineEntry, TimelineSong, WidgetConfig } from './types';

const NO_ART_URL = 'https://rainwave.cc/static/images4/noart_1.jpg';

function buildAlbumArtUrl(albumArt: string | null, size = 320): string {
  if (!albumArt) {
    return NO_ART_URL;
  }
  if (albumArt.startsWith('http://') || albumArt.startsWith('https://')) {
    return `${albumArt}_${size}.jpg`;
  }

  return `https://rainwave.cc/${albumArt}_${size}.jpg`;
}

function artistNames(song: TimelineSong): string {
  return song.artists
    .slice()
    .toSorted((a, b) => a.order - b.order)
    .map((artist) => artist.name)
    .join(', ');
}

function nowPlayingFromSchedule(
  entry: TimelineEntry,
  config: Pick<WidgetConfig, 'showRequesters'>,
): NowPlaying | null {
  const song = entry.songs[0];
  if (!song) {
    return null;
  }
  const album = song.albums[0];

  return {
    id: song.id,
    title: song.title,
    artist: artistNames(song),
    album: album?.name || '',
    artUrl: buildAlbumArtUrl(album?.art || null),
    requester: config.showRequesters ? song.elec_request_username : null,
  };
}

export { NO_ART_URL, artistNames, buildAlbumArtUrl, nowPlayingFromSchedule };
