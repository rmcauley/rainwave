import { $l } from '../language';
import type { components } from '../rainwaveApi/rainwave-openapi';
import { getStationName } from './getStationName';
import { stationOrder } from './stations';

type DetailSongsAcrossStationsTableData = {
  sid: number;
  header: string;
  songs: Array<components['schemas']['_song_in_cross_station_query']>;
};

function sortAllSongsTableData(
  a: DetailSongsAcrossStationsTableData,
  b: DetailSongsAcrossStationsTableData,
): number {
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

function getDetailTableDataFromSongsAcrossStations(
  allSongs: components['schemas']['_all_songs_in_cross_station_query'],
  includeStationNameInHeader: boolean,
): Array<DetailSongsAcrossStationsTableData> {
  const tablesData: Array<DetailSongsAcrossStationsTableData> = [];
  Object.entries(allSongs).forEach(([sid, albums]) => {
    Object.entries(albums).forEach(([_albumId, songs]) => {
      const firstSong = songs[0];
      if (firstSong) {
        tablesData.push({
          sid: Number(sid),
          header: includeStationNameInHeader
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

export { getDetailTableDataFromSongsAcrossStations };
