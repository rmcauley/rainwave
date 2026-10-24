const RatingColors = {
  "1.0": "#11537f",
  "1.5": "#206898",
  "2.0": "#2873a7",
  "2.5": "#3281b7",
  "3.0": "#3789c1",
  "3.5": "#3789c1",
  "4.0": "#459cd7",
  "4.5": "#4ca6e3",
  "5.0": "#55b3f3",
};

const RatingChart = function (json) {
  const data = [];
  for (const i in RatingColors) {
    if (i in json.rating_histogram) {
      data.push({
        value: json.rating_histogram[i],
        color: RatingColors[i],
        label: i,
        tooltip: `${Formatting.rating(i)  }: ${  json.rating_histogram[i]}`,
      });
    }
  }
  if (data.length === 0) {return;}
  const c = HDivChart(data, { minShare: 4, addShareToTooltip: true });
  c.classList.add("chart-ratings");
  
return c;
};
