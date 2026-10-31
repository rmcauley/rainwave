import { getStationName } from '../../../helpers/getStationName';
import { stationOrder } from '../../../helpers/stations';
import { $l } from '../../../language';
import type { components } from '../../../rainwaveApi/rainwave-openapi';

type AllSongsTableData = {
  sid: number;
  header: string;
  songs: components['schemas']['album']['songs'];
};

function sortAllSongsTableData(a: AllSongsTableData, b: AllSongsTableData): number {
  const stationPosA = stationOrder.indexOf(a.sid);
  const stationPosB = stationOrder.indexOf(b.sid);
  if (stationPosA < stationPosB) {
    return -1;
  } else if (stationPosB > stationPosA) {
    return 1;
  }

  const headerA = a.header.toLowerCase();
  const headerB = b.header.toLowerCase();
  if (headerA < headerB) {
    return -1;
  } else if (headerA > headerB) {
    return 1;
  }

  return 0;
}

function getTableDataFromAllSongs(
  allSongs: components['schemas']['_all_songs_for_artist'],
  includeStationInHeader: boolean,
): Array<AllSongsTableData> {
  const tablesData: Array<AllSongsTableData> = [];
  Object.entries(allSongs).forEach(([sid, albums]) => {
    Object.entries(albums).forEach(([_albumId, songs]) => {
      const firstSong = songs[0];
      if (firstSong) {
        tablesData.push({
          sid: Number(sid),
          header: includeStationInHeader
            ? $l('album_on_station', {
                station: getStationName(sid),
                album: firstSong.albums[0].name,
              })
            : firstSong.albums[0].name,
          songs: [],
        });
      }
    });
  });
  tablesData.sort(sortAllSongsTableData);
  return tablesData;
}

export { getTableDataFromAllSongs };
