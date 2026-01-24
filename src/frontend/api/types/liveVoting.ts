import type { RainwaveEventSong, SongBase } from '.';

export interface LiveVotingEntry {
  entry_id: RainwaveEventSong['entry_id'];
  entry_votes: RainwaveEventSong['entry_votes'];
  song_id: SongBase['id'];
}

export type LiveVoting = Record<number, LiveVotingEntry[]>;
