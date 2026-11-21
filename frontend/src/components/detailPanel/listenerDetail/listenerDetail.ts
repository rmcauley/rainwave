import { $l } from '../../../language';
import { api } from '../../../rainwaveApi/api';
import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { ratingChart } from '../../horizontalStackChart/ratingChart';
import { listenerDetailTemplate } from './listenerDetail.template';
import { listenerDetailByStationChart } from './listenerDetailByStationChart/listenerDetailByStationChart';
import { listenerDetailStationBarChart } from './listenerDetailStationBarChart/listenerPanelStationBarChart';

function listenerDetail(
  payload: components['schemas']['listener'],
): ReturnType<typeof listenerDetailTemplate>['$root'] {
  const template = listenerDetailTemplate({
    isSelf: api.user.id === payload.user_id,
    listener: payload,
    registrationYear: new Date(payload.regdate * 1000).getFullYear(),
  });

  const userDetail = template.userDetail;

  const ratingSpreadData = Object.fromEntries(
    payload.rating_spread.map(({ rating, ratings }) => [
      rating as keyof components['schemas']['_rating_histogram'],
      ratings,
    ]),
  ) as components['schemas']['_rating_histogram'];
  const ratingSpread = ratingChart(ratingSpreadData);
  if (ratingSpread) {
    userDetail.appendChild(ratingSpread);
  }

  const avgRatingByStation = new Map<number, number>();
  const ratingCompletionByStation = new Map<number, number>();
  payload.ratings_by_station.forEach((rbs) => {
    avgRatingByStation.set(rbs.sid, Number(rbs.average_rating));
    ratingCompletionByStation.set(rbs.sid, rbs.ratings);
  });

  userDetail.appendChild(
    listenerDetailStationBarChart(avgRatingByStation, $l('average_rating_by_station'), {
      max: 5,
      guidelineCount: 5,
    }),
  );

  userDetail.appendChild(
    listenerDetailByStationChart(payload.votes_by_station, 'votes', $l('votes_by_station')),
  );
  userDetail.appendChild(
    listenerDetailByStationChart(
      payload.requests_by_station,
      'requests',
      $l('requests_by_station'),
    ),
  );
  userDetail.appendChild(
    listenerDetailByStationChart(
      payload.requests_by_source_station,
      'requests',
      $l('requests_by_source_station'),
    ),
  );

  userDetail.appendChild(
    listenerDetailStationBarChart(ratingCompletionByStation, $l('ratings_completion_rate'), {
      max: 100,
      guidelineCount: 5,
      addShareToLabel: true,
    }),
  );

  return template.$root;
}

export { listenerDetail };
