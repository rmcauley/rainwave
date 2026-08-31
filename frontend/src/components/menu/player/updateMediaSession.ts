import { getAlbumArt } from '../../../helpers/albumArt';
import { api } from '../../../rainwaveApi';
import { components } from '../../../rainwaveApi/rainwave-openapi';

function updateMediaSession(nowPlaying: components['schemas']['sched_current']): void {
  const song = nowPlaying.songs[0];
  if (!song || !api.user.tuned_in) {
    return;
  }
  const artwork = [
    {
      src: new URL(getAlbumArt(song), window.location.origin).toString(),
      sizes: '320x320',
      type: 'image/jpeg',
    },
  ];

  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title,
    artist: song.artists.map((artist) => artist.name).join(', '),
    album: song.albums[0].name,
    artwork: artwork,
  });
}

export { updateMediaSession };
