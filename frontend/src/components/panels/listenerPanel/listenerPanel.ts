import { $l } from '../../../language';
import { api } from '../../../rainwaveApi/api';
import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { ratingChart } from '../../horizontalStackChart/ratingChart';
import { listenerPanelTemplate } from './listenerPanel.template';
import { listenerPanelByStationChart } from './listenerPanelByStationChart/listenerPanelByStationChart';
import { listenerPanelStationBarChart } from './listenerPanelStationBarChart/listenerPanelStationBarChart';

class ListenerPanel {
  template: ReturnType<typeof listenerPanelTemplate>;

  constructor(payload: components['schemas']['listener']) {
    this.template = listenerPanelTemplate({
      isSelf: api.user.id === payload.user_id,
      listener: payload,
      registrationYear: new Date(payload.regdate * 1000).getFullYear(),
    });

    const userDetail = this.template.userDetail;

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
      listenerPanelStationBarChart(avgRatingByStation, $l('average_rating_by_station'), {
        max: 5,
        guidelineCount: 5,
      }),
    );

    userDetail.appendChild(
      listenerPanelByStationChart(payload.votes_by_station, 'votes', $l('votes_by_station')),
    );
    userDetail.appendChild(
      listenerPanelByStationChart(
        payload.requests_by_station,
        'requests',
        $l('requests_by_station'),
      ),
    );
    userDetail.appendChild(
      listenerPanelByStationChart(
        payload.requests_by_source_station,
        'requests',
        $l('requests_by_source_station'),
      ),
    );

    userDetail.appendChild(
      listenerPanelStationBarChart(ratingCompletionByStation, $l('ratings_completion_rate'), {
        max: 100,
        guidelineCount: 5,
        addShareToLabel: true,
      }),
    );
  }
}

export { ListenerPanel };
