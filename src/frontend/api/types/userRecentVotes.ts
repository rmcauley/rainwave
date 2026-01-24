import type { Album, SongBase } from '.';

export interface UserRecentVote {
  album_name: Album['name'];
  fave: SongBase['fave'];
  id: SongBase['id'];
  rating: SongBase['rating'];
  rating_user: SongBase['rating_user'];
  title: SongBase['title'];
}

export type UserRecentVotes = UserRecentVote[];
