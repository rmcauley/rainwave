import { getServerTime } from '../../helpers/serverTime';

const isNewThreshold = 86400 * 7;

function isPlaylistItemNew(itemTime: number): boolean {
  return itemTime < getServerTime() - isNewThreshold;
}

export { isPlaylistItemNew };
