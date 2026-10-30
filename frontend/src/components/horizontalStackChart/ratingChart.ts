import type { components } from '../../rainwaveApi/rainwave-openapi';
import type { HorizontalStackChartDatum } from './horizontalStackChart';
import { horizontalStackChart } from './horizontalStackChart';

const RatingColors: Record<keyof components['schemas']['_rating_histogram'], string> = {
  '1.0': '#11537f',
  '1.5': '#206898',
  '2.0': '#2873a7',
  '2.5': '#3281b7',
  '3.0': '#3789c1',
  '3.5': '#3789c1',
  '4.0': '#459cd7',
  '4.5': '#4ca6e3',
  '5.0': '#55b3f3',
};

function ratingChart(
  ratingHistogram: components['schemas']['_rating_histogram'] | null | undefined,
): HTMLElement | undefined {
  if (!ratingHistogram) {
    return undefined;
  }

  const chartData: HorizontalStackChartDatum[] = [];
  Object.entries(ratingHistogram).forEach(([rating, ratingShare]) => {
    chartData.push({
      value: ratingShare,
      color: RatingColors[rating as keyof components['schemas']['album']['rating_histogram']],
      label: rating,
      tooltip: `${rating}: ${ratingShare}`,
    });
  });

  if (chartData.length === 0) {
    return undefined;
  }

  return horizontalStackChart(chartData, { minShare: 4, addShareToTooltip: true });
}

export { ratingChart };
