import './ratingSpreadChart.module.scss';

interface HorizontalStackChartDatum {
  value: number;
  color: string;
  label: string;
  tooltip?: string;
}

interface HorizontalStackChartOptions {
  max?: number;
  minShare?: number;
  addShareToLabel?: boolean;
  addShareToTooltip?: boolean;
  guidelineCount?: number;
}

function horizontalStackChart(
  data: HorizontalStackChartDatum[],
  options?: HorizontalStackChartOptions,
): HTMLElement {
  const { addShareToLabel, addShareToTooltip, guidelineCount } = options ?? {};
  const minShare = options?.minShare ?? 0;

  const totalValue = options?.max || data.reduce((tv, d) => tv + d.value, 0);

  const container = document.createElement('div');
  container.className = 'horizontal-stack-chart';
  let xPosPercent = 0;
  data.forEach((datum) => {
    const share = Math.floor((datum.value / totalValue) * 100);
    const shareAccurate = Math.round((datum.value / totalValue) * 100);

    let label = datum.label;
    if (addShareToLabel) {
      label += `${share}%`;
    }

    let tooltip = datum.tooltip;
    if (addShareToTooltip && tooltip) {
      tooltip += ` (${shareAccurate}%)`;
    }

    const datumDiv = document.createElement('div');
    datumDiv.className = 'horizontal-stack-chart-bar';
    datumDiv.style.width = `${share}%`;
    datumDiv.style.backgroundColor = datum.color;
    datumDiv.style.left = `${xPosPercent}%`;

    if (datum.label && share >= minShare && (!guidelineCount || data.length !== 1)) {
      const datumLabel = document.createElement('span');
      datumLabel.className = 'chart-label';
      datumLabel.textContent = label;
      datumDiv.appendChild(datumLabel);
    }

    if (tooltip) {
      const datumTooltip = document.createElement('span');
      datumTooltip.classList.add('horizontal-stack-chart-tooltip');
      if (xPosPercent <= 15) {
        datumTooltip.classList.add('horizontal-stack-chart-tooltip--left');
      } else if (xPosPercent >= 85) {
        datumTooltip.classList.add('horizontal-stack-chart-tooltip--right');
      }
      datumTooltip.textContent = tooltip;
      datumDiv.appendChild(datumTooltip);
    }

    xPosPercent += share;

    container.appendChild(datumDiv);
  });

  if (guidelineCount) {
    for (let i = 1; i < guidelineCount; i++) {
      const percentLine = document.createElement('div');
      percentLine.className = 'horizontal-stack-chart-tooltip';
      percentLine.style.left = `${Math.round(100 / guidelineCount) * i}%`;
      container.appendChild(percentLine);
    }
  }

  return container;
}

export { horizontalStackChart };
export type { HorizontalStackChartDatum, HorizontalStackChartOptions };
