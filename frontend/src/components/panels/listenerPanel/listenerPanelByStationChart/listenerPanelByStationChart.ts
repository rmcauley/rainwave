import { stations } from '../../../../helpers/stations';
import type { HorizontalStackChartDatum } from '../../../horizontalStackChart/horizontalStackChart';
import { horizontalStackChart } from '../../../horizontalStackChart/horizontalStackChart';

function listenerPanelByStationChart<D extends { sid: number }, T extends keyof D>(
  data: Array<D & Record<T, number>>,
  valueKey: T,
  headerText: string,
): HTMLElement {
  const element = document.createElement('div');
  element.className = 'listener-panel-chart';

  const voteByStationHeader = document.createElement('div');
  voteByStationHeader.className = 'listener-panel-subheader';
  voteByStationHeader.textContent = headerText;
  element.appendChild(voteByStationHeader);

  const votesByStationData: HorizontalStackChartDatum[] = data.map((datum) => {
    const station = stations.get(datum.sid)!;
    return {
      color: station.color,
      label: station.name,
      value: datum[valueKey],
    } satisfies HorizontalStackChartDatum;
  });
  element.appendChild(horizontalStackChart(votesByStationData));

  return element;
}

export { listenerPanelByStationChart };
