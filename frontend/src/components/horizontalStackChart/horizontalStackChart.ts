import './ratingSpreadChart.module.scss';

interface HorizontalStackChartDatum {
  value: number;
  color: string;
  label: string;
  tooltip: string;
}

interface HorizontalStackChartOptions {
  minShare?: number;
  addShareToLabel?: boolean;
  addShareToTooltip?: boolean;
  percentLineInterval?: number;
}

function horizontalStackChart(
  data: HorizontalStackChartDatum[],
  options?: HorizontalStackChartOptions,
): HTMLElement {
  const { addShareToLabel, addShareToTooltip, percentLineInterval } = options ?? {};
  const minShare = options?.minShare ?? 0;

  const totalValue = data.reduce((tv, d) => tv + d.value, 0);

  const container = document.createElement('div');
  container.className = 'rating-spread-chart';
  let xPosPercent = 0;
  data.forEach((datum) => {
    const share = Math.floor((datum.value / totalValue) * 100);
    const shareAccurate = Math.round((datum.value / totalValue) * 100);

    let label = datum.label;
    if (addShareToLabel) {
      label += `${share}%`;
    }

    let tooltip = datum.tooltip;
    if (addShareToTooltip) {
      tooltip += ` (${shareAccurate}%)`;
    }

    const datumDiv = document.createElement('div');
    datumDiv.className = 'rating-spread-chart-bar';
    datumDiv.style.width = `${share}%`;
    datumDiv.style.backgroundColor = datum.color;
    datumDiv.style.left = `${xPosPercent}%`;

    if (datum.label && share >= minShare && (!percentLineInterval || data.length !== 1)) {
      const datumLabel = document.createElement('span');
      datumLabel.className = 'chart-label';
      datumLabel.textContent = label;
      datumDiv.appendChild(datumLabel);
    }

    if (datum.tooltip) {
      const datumTooltip = document.createElement('span');
      if (xPosPercent <= 15) {
        datumTooltip.className = 'chart-tooltip chart-tooltip-left';
      } else if (xPosPercent >= 85) {
        datumTooltip.className = 'chart-tooltip chart-tooltip-right';
      } else {
        datumTooltip.className = 'chart-tooltip';
      }
      datumTooltip.textContent = tooltip;
      datumDiv.appendChild(datumTooltip);
    }

    xPosPercent += share;

    container.appendChild(datumDiv);
  });

  if (percentLineInterval) {
    for (let i = 1; i < percentLineInterval; i++) {
      const percentLine = document.createElement('div');
      percentLine.className = 'chart-pip';
      percentLine.style.left = `${Math.round(100 / percentLineInterval) * i}%`;
      container.appendChild(percentLine);
    }
  }

  return container;
}

export { horizontalStackChart };
export type { HorizontalStackChartDatum, HorizontalStackChartOptions };
