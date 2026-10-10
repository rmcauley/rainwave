import { getServerTime } from '../../helpers/clock';

const isNewThreshold = 86400 * 7;

function isPlaylistItemNew(itemTime: number): boolean {
  return itemTime < getServerTime() - isNewThreshold;
}

export { isPlaylistItemNew };
