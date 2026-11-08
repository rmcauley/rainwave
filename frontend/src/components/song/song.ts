import { preferences } from '../../preferences/preferences';
import { api } from '../../rainwaveApi/api';
import { setAlbumArt } from '../albumArt/albumArt';
import { AlbumFave } from '../fave/albumFave/albumFave';
import { SongFave } from '../fave/songFave/songFave';
import { AlbumRating } from '../ratings/albumRating/albumRating';
import { SongRating } from '../ratings/songRating/songRating';
import type { songContext } from './song.context';
import { songTemplate } from './song.template';

type SongConstructorData = Omit<songContext, 'isPowerUserMode' | 'sid' | 'userId'>;

abstract class Song {
  template: ReturnType<typeof songTemplate>;

  protected song: songContext['song'];

  constructor(data: SongConstructorData) {
    this.song = data.song;
    this.template = songTemplate({
      ...data,
      isPowerUserMode: preferences.store.powerUserMode,
      sid: api.user.sid,
      song: data.song,
      userId: api.user.id,
    });
    setAlbumArt(this.template.artImage, this.song.albums[0].art);
    this.template.rating.appendChild(
      SongRating.create(this.song.id, this.song.rating_user, this.song.rating),
    );
    this.template.fave.appendChild(
      SongFave.create(this.song.id, this.song.fave, this.template.title),
    );
    this.template.albumRating.appendChild(
      AlbumRating.create(
        this.song.albums[0].id,
        this.song.albums[0].rating_user,
        this.song.albums[0].rating,
      ),
    );
    this.template.albumFave.appendChild(
      AlbumFave.create(this.song.albums[0].id, this.song.albums[0].fave, this.template.title),
    );
  }

  abstract update(): void;
}

export { Song };
export type { SongConstructorData };
