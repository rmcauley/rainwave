import { SongBase } from "./songBase";
import Station from "./station";
import RainwaveTime from "./time";

interface GroupSong extends Omit<SongBase, "artists"> {
  cool_end: RainwaveTime;
  cool: boolean;
  requestable: boolean;
}

export default interface GroupWithDetail {
  id: number;
  name: string;
  all_songs_for_sid: Record<number, Record<Station, GroupSong>>;
}