import { formatRating } from '../../../../../helpers/formatRating';
import { $l } from '../../../../../language';
import type { components } from '../../../../../rainwaveApi/rainwave-openapi';
import { ratingChart } from '../../../../horizontalStackChart/ratingChart';
import { songDetailTemplate } from './songDetail.template';

function songDetail(
  song: components['schemas']['album']['songs'][number],
  detail: components['schemas']['song'],
  colspan: number,
): HTMLElement {
  const tr = document.createElement('tr');
  tr.setAttribute('colspan', colspan.toString());
  tr.className = 'song-detail';

  let ratingPercentileMessage;
  if (detail.rating_rank_percentile >= 50) {
    ratingPercentileMessage = $l('rating_percentile_top', {
      rating: song.rating,
      percentile: detail.rating_rank_percentile,
      percentile_top: 100 - detail.rating_rank_percentile,
    });
  } else {
    ratingPercentileMessage = $l('rating_percentile_bottom', {
      rating: song.rating,
      percentile: detail.rating_rank_percentile,
    });
  }

  const ratingDetailText = $l('rating_detail_numbers', {
    rating: formatRating(song.rating),
    count: detail.rating_count,
    percentile: detail.rating_rank_percentile,
    percentile_message: ratingPercentileMessage,
  });

  const template = songDetailTemplate({
    artists: detail.artists,
    groups: detail.groups,
    ratingDetailText,
  });

  if (template.graphPlacement) {
    const chart = ratingChart(detail.rating_histogram);
    if (chart) {
      template.graphPlacement.appendChild(chart);
    }
  }

  return tr;
}

export { songDetail };
