import { formatRating } from '../../../../helpers/formatRating';
import { $l } from '../../../../language';
import { api } from '../../../../rainwaveApi/api';
import type { components } from '../../../../rainwaveApi/rainwave-openapi';
import { ratingChart } from '../../../horizontalStackChart/ratingChart';
import { songDetailTemplate } from './songDetail.template';

async function renderSongDetail(
  song: components['schemas']['album']['songs'][number],
  colspan: number,
): Promise<void> {
  const tr = document.createElement('tr');
  tr.setAttribute('colspan', colspan.toString());
  tr.className = 'song-detail';

  const songDetail = (await api.fetch('song', { id: song.id })).song;

  let ratingPercentileMessage;
  if (songDetail.rating_rank_percentile >= 50) {
    ratingPercentileMessage = $l('rating_percentile_top', {
      rating: song.rating,
      percentile: songDetail.rating_rank_percentile,
      percentile_top: 100 - songDetail.rating_rank_percentile,
    });
  } else {
    ratingPercentileMessage = $l('rating_percentile_bottom', {
      rating: song.rating,
      percentile: songDetail.rating_rank_percentile,
    });
  }

  const ratingDetailText = $l('rating_detail_numbers', {
    rating: formatRating(song.rating),
    count: songDetail.rating_count,
    percentile: songDetail.rating_rank_percentile,
    percentile_message: ratingPercentileMessage,
  });

  const template = songDetailTemplate({
    artists: songDetail.artists,
    groups: songDetail.groups,
    ratingDetailText,
  });

  if (template.graphPlacement) {
    const chart = ratingChart(songDetail.rating_histogram);
    if (chart) {
      template.graphPlacement.appendChild(chart);
    }
  }
}

export { renderSongDetail };
