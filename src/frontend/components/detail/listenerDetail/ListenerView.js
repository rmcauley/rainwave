var ListenerView = function (json, el) {
  for (var i = 0; i < json.top_albums.length; i++) {
    json.top_albums[i].rating_site = json.top_albums[i].rating;
    json.top_albums[i].rating = json.top_albums[i].rating_listener;
    json.top_albums[i].rating_user = true;
  }

  // no need to be terribly accurate here
  json.regdate = new Date(json.regdate * 1000).getYear() + 1900;
  var template = RWTemplates.detail.listener(
    json,
    document.createElement("div"),
  );
  template._headerText = json.name;

  for (i = 0; i < json.top_albums.length; i++) {
    Rating.fake_effect(json.top_albums[i], json.top_albums[i].rating);
    json.top_albums[i].$t.rating_hover_number.classList.add("listener_number");
    if (json.user_id == User.id) {
      json.top_albums[i].$t.rating.classList.add("rating_user");
    }
  }

  el.appendChild(template._root);

  var detailContainer = template.user_detail_container;

  var drawChart = function (jd, key, headerText, overflowHidden) {
    var data = [];
    var i, j, sid;
    for (j = 0; j < Stations.length; j++) {
      sid = Stations[j].id;
      for (i = 0; i < jd.length; i++) {
        if (jd[i].sid == sid) {
          data.push({
            value: jd[i][key],
            color: Stations[j].color,
            label: Stations[j].name + ": ",
          });
          break;
        }
      }
    }
    if (data.length > 0) {
      var hdr = document.createElement("div");
      hdr.className = "graph_header";
      hdr.textContent = headerText;
      detailContainer.appendChild(hdr);
      var chrt = HDivChart(data, { addShareToLabel: true });
      if (overflowHidden) {
        chrt.classList.add("overflow_hidden");
      }
      detailContainer.appendChild(chrt);
    }
  };

  var sid, j, hdr, chart;

  // done for compatibility with RatingChart
  json.rating_histogram = {};
  for (i = 0; i < json.rating_spread.length; i++) {
    json.rating_histogram[Formatting.rating(json.rating_spread[i].rating)] =
      json.rating_spread[i].ratings;
  }
  chart = RatingChart(json);
  if (chart) {
    hdr = document.createElement("div");
    hdr.className = "graph_header";
    hdr.textContent = $l("rating_spread");
    detailContainer.appendChild(hdr);
    detailContainer.appendChild(chart);

    hdr = document.createElement("div");
    hdr.className = "graph_header";
    hdr.textContent = $l("average_rating_by_station");
    detailContainer.appendChild(hdr);
    var found;
    for (i = 0; i < Stations.length; i++) {
      sid = Stations[i].id;
      if (sid == 5) continue;
      found = false;
      for (j = 0; j < json.ratings_by_station.length; j++) {
        if (json.ratings_by_station[j].sid == sid) {
          found = true;
          chart = HDivChart(
            [
              {
                value: json.ratings_by_station[j].average_rating,
                color: Stations[i].color,
                label:
                  Stations[i].name +
                  ": " +
                  Formatting.rating(json.ratings_by_station[j].average_rating),
              },
            ],
            { max: 5, guideLines: 5 },
          );
          chart.classList.add("chart_overflow");
          detailContainer.appendChild(chart);
        }
      }
      if (!found) {
        chart = HDivChart(
          [
            {
              value: 0,
              color: Stations[i].color,
              label: Stations[i].name + ": " + $l("no_ratings"),
            },
          ],
          { max: 5, guideLines: 5 },
        );
        chart.classList.add("chart_overflow");
        detailContainer.appendChild(chart);
      }
    }
  }

  drawChart(json.votes_by_station, "votes", $l("votes_by_station"), true);
  drawChart(
    json.requests_by_station,
    "requests",
    $l("requests_by_station"),
    true,
  );
  // draw_chart(json.votes_by_source_station, "votes", $l("votes_by_source_station"), true);
  drawChart(
    json.requests_by_source_station,
    "requests",
    $l("requests_by_source_station"),
    true,
  );
  //draw_chart(json.ratings_by_station, "ratings", $l("rating_counts_across_stations"), true);

  hdr = document.createElement("div");
  hdr.className = "graph_header";
  hdr.textContent = $l("ratings_completion_rate");
  detailContainer.appendChild(hdr);
  for (i = 0; i < Stations.length; i++) {
    sid = Stations[i].id;
    if (sid == 5) continue;
    chart = HDivChart(
      [
        {
          value: json.rating_completion[sid] || 0,
          color: Stations[i].color,
          label:
            Stations[i].name + ": " + (json.rating_completion[sid] || 0) + "%",
        },
      ],
      { max: 100, guideLines: 5 },
    );
    chart.classList.add("chart_overflow");
    detailContainer.appendChild(chart);
  }

  return template;
};

export { ListenerView };
