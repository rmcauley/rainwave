import { stations } from '../../../../helpers/stations';
import type { HorizontalStackChartOptions } from '../../../horizontalStackChart/horizontalStackChart';
import { horizontalStackChart } from '../../../horizontalStackChart/horizontalStackChart';

function listenerPanelStationBarChart(
  data: Map<number, number>,
  headerText: string,
  options?: HorizontalStackChartOptions,
): HTMLElement {
  const element = document.createElement('div');
  element.className = 'listener-panel-chart';

  const header = document.createElement('div');
  header.className = 'listener-panel-subheader';
  header.textContent = headerText;
  element.appendChild(element);

  stations.forEach((station) => {
    const value = data.get(station.id) ?? 0;
    if (station.id !== 5) {
      element.appendChild(
        horizontalStackChart(
          [
            {
              color: station.color,
              label: `${station.name}: `,
              value: value,
            },
          ],
          options,
        ),
      );
    }
  });

  return element;
}

export { listenerPanelStationBarChart };
