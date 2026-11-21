import type { components } from '../../../rainwaveApi/rainwave-openapi';

type DetailSong =
  | components['schemas']['songs'][number]
  | components['schemas']['album']['songs'][number]
  | components['schemas']['_song_in_cross_station_query'];

interface detailSongRowContext {
  song: Omit<DetailSong, 'artist_parseable'> & {
    artist_parseable?: components['schemas']['album']['songs'][number]['artist_parseable'];
  };
  showRatingClear: boolean;
  power: boolean;
  artists?: Array<components['schemas']['_artist']>;
}

export type { detailSongRowContext, DetailSong };
