import type { AlbumInList } from './allAlbumsPaginated';

export type AlbumDiff = Pick<AlbumInList, 'id' | 'cool' | 'cool_lowest' | 'newest_song_time'>[];
