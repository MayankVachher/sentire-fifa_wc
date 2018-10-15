var modalClose = d3.select(".delete");

modalClose.on("click", function() {
  d3.select("#openingModal")
    .attr("class", "modal");
})

var launchModal = d3.select("#launch_modal");

launchModal.on("click", function() {
  d3.select("#openingModal")
    .attr("class", "modal is-active");
})

var posnegratio = 1;

// Setup the Globe
var globe_svg = d3.select("#globe"),
    globe_container = d3.select("#globe_container").node(),
    globe_width = +globe_container.getBoundingClientRect().width,
    globe_height = +globe_svg.attr("height");

globe_svg.attr("width", globe_width);

var min_val = Math.min(globe_width, globe_height);

var globe_projection = d3.geoOrthographic()
  .translate([globe_width / 2, globe_height / 2])
  .scale(((min_val- 50)/2) - 20)
  .clipAngle(90);

var globe_path = d3.geoPath()
  .projection(globe_projection);

globe_svg.append("circle")
      .attr("class", "fill_globe")
      .attr("cx", globe_width / 2)
      .attr("cy", globe_height / 2)
      .attr("r", globe_projection.scale());

// Legend setup

var legend_svg = d3.select("#legend"),
    legend_container = d3.select("#legend_container").node(),
    legend_width = +legend_container.getBoundingClientRect().width,
    legend_height = +legend_container.getBoundingClientRect().height;

legend_svg.attr("width", legend_width);
legend_svg.attr("height", legend_height);

// Setup the Flatmap
var flat_svg = d3.select("#flat"),
    flat_container = d3.select("#flat_container").node(),
    flat_width = +flat_container.getBoundingClientRect().width,
    flat_height = +flat_svg.attr("height");

flat_svg.attr("width", flat_width);

var flat_projection = d3.geoMercator()
    .scale((flat_width - 3) / (2 * Math.PI))
    .translate([flat_width / 2, flat_height / 2]);

var flat_path = d3.geoPath()
    .projection(flat_projection);

flat_svg.append("defs").append("path")
    .datum({type: "Sphere"})
    .attr("id", "sphere")
    .attr("d", flat_path);

flat_svg.append("use")
    .attr("class", "fill")
    .attr("xlink:href", "#sphere");

var country_title = d3.select("#country_loc");
var tod = d3.select("#tod");

d3.queue()
  // .defer(d3.json, "https://unpkg.com/world-atlas@1/world/50m.json")
  .defer(d3.json, "/data/world-110m-with-names.json")
  .defer(d3.json, "https://unpkg.com/world-atlas@1/world/110m.json")
  .defer(d3.csv, "/data/data_fifa_wc_finals.csv")
  .await(globe_ready);

function min_max_norm(val, max, min) { return (val - min) / (max - min); }

function globe_ready(error, world, world_land, our_data) {

  var countries = topojson.feature(world_land, world_land.objects.countries).features,
      countries_name = topojson.feature(world, world.objects.countries).features,
      country_score = [],
      activated = [],
      i = -1,
      n = our_data.length;

  var globe_country = globe_svg.selectAll(".globe_country")
      .data(countries)
      .enter()
      .insert("path", ".graticule")
      .attr("class", "globe_country")
      .attr("d", globe_path);

  var flat_country = flat_svg.selectAll(".flat_country")
      .data(countries)
      .enter()
      .insert("path", ".graticule")
      .attr("class", "flat_country")
      .attr("d", flat_path);

  twttr.widgets.load(
      document.getElementById("tweet")
    );

  var color_scale = d3.interpolatePiYG;

  // Slider

  var formatTime = d3.timeFormat("%I:%M%p %d/%m");

  var startDate = new Date(our_data[0]["Date (PST)"]),
      endDate = new Date(our_data[our_data.length - 1]["Date (PST)"]);

  var slider_svg = d3.select("#slider"),
      slider_container = d3.select("#slider_container").node();

  var slider_margin = {top:0, right:50, bottom:0, left:50},
      slider_width = slider_container.getBoundingClientRect().width - slider_margin.left - slider_margin.right,
      slider_height = 80 - slider_margin.top - slider_margin.bottom;

  slider_svg.attr("width", slider_width + slider_margin.left + slider_margin.right)
            .attr("height", slider_height);

  var moving = false;
  var currentValue = 0;
  var targetValue = our_data.length;

  var playButton = d3.select("#play-button");

  var slider_x = d3.scaleTime()
                    .domain([startDate, endDate])
                    .range([0, slider_width])
                    .clamp(true);

  var slider = slider_svg.append("g")
                  .attr("class", "slider")
                  .attr("transform", "translate(" + slider_margin.left + "," + slider_height / 2 + ")");

  slider.append("line")
              .attr("class", "track")
              .attr("x1", slider_x.range()[0])
              .attr("x2", slider_x.range()[1])
          .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
              .attr("class", "track-inset")
          .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
              .attr("class", "track-overlay")
              .call(d3.drag()
                .on("start.interrupt", function() { slider.interrupt(); })
                .on("start drag", function() {
                  var local_pos = slider_x.invert(d3.event.x);
                  var new_data = our_data.filter(function(d) {
                    return new Date(d['Date (PST)']) < local_pos;
                  });
                  currentValue = new_data.length - 1;
                  if (currentValue < 0) {
                    currentValue = 0;
                  }
                  update(local_pos);
                })
              );

  slider.insert("g", ".track-overlay")
              .attr("class", "ticks")
              .attr("transform", "translate(0," + 18 + ")")
            .selectAll("text")
              .data(slider_x.ticks(10))
                .enter()
                .append("text")
                .attr("x", slider_x)
                .attr("y", 10)
                .attr("class", "slider_labels")
                .attr("text-anchor", "middle")
                .text(function(d) { return formatTime(d); });

  var handle = slider.insert("circle", ".track-overlay")
            .attr("class", "handle")
            .attr("r", 9);

  var label = slider.append("text")
              .attr("class", "label")
                .attr("text-anchor", "middle")
                  .text(function(d) {
                          console.log(formatTime(d).toString() + "(PST)");
                          return formatTime(d).toString() + "(PST)";
                    })
                  .attr("transform", "translate(25," + (-25) + ")");

  playButton
    .on("click", function() {
    var button = d3.select(this);
    if (button.text() == "Pause") {
      moving = false;
      clearInterval(timer);
      // timer = 0;
      button.text("Play");
    } else {
      moving = true;
      timer = setInterval(step, 1000);
      button.text("Pause");
    }
  });

  var defs = legend_svg.append('defs');

  var linearGradient = defs.append('linearGradient')
                            .attr('id', 'linear-gradient');

  linearGradient
          .attr("x1", "0%")
          .attr("y1", "0%")
          .attr("x2", "100%")
          .attr("y2", "0%");

  linearGradient.selectAll("stop")
      .data([
        {offset: "0%", color: color_scale(0)},
        // {offset: "49.99%", color: "#caadd4"},
        {offset: "50%", color: color_scale(0.5)},
        // {offset: "50.01%", color: "#99cfaf"},
        {offset: "100%", color: color_scale(1)}
      ])
      .enter().append("stop")
      .attr("offset", function(d) {
        return d.offset;
      })
      .attr("stop-color", function(d) {
        return d.color;
      });

  legend_svg.append("text")
            .attr("class", "legendTitle")
            .attr("x", 0)
            .attr("y", 20)
            .style("text-anchor", "start")
            .text("Sentiment");

  legend_svg.append("rect")
    .attr("x", 10)
    .attr("y", 30)
    .attr("width", 400)
    .attr("height", 15)
    .style("fill", "url(#linear-gradient)");

    //create tick marks
  var xLeg = d3.scaleLinear()
    .domain([0, 1])
    .range([50, 370]);

  var axisLeg = d3.axisBottom(xLeg)
    .tickValues([0, 1])
    .tickFormat(function(d) {
      if (d === 0.0) {
        return "Negative";
      }
      else if (d === 1.0) {
        return "Positive";
      }
      else {
        return "";
      }
    })

  legend_svg
    .attr("class", "axis is-pulled-right")
    .append("g")
    .attr("transform", "translate(0, 40)")
    .call(axisLeg);

function step() {
  var local_value = new Date(our_data[currentValue]['Date (PST)']);
  update(local_value);
  currentValue += 1;
  if (currentValue >= targetValue) {
    moving = false;
    currentValue = 0;
    clearInterval(timer);
    // timer = 0;
    playButton.text("Play");
  }
}

  function drawPlot(given_data) {

    var pos = [],
        neg = [];

    for (var j = 0; j < countries.length; j++) {
      pos[j] = 0;
      neg[j] = 0;
      country_score[j] = 0;
      activated[j] = false;
    }

    for (var j = 0; j < given_data.length; j++) {
      for (var flag = 0; flag < countries_name.length; flag++) {
        if (countries_name[flag]['id'] === given_data[j]["Country"]) {
          break;
        }
      }

      activated[flag] = true;
      if (given_data[j]["Category"] === "Positive") {
        country_score[flag] += posnegratio;
        pos[flag] += posnegratio;
      }
      else {
        country_score[flag] -= 1;
        neg[flag] += 1;
      }


    }

    var n = given_data.length - 1;

    for (var flag = 0; flag < countries_name.length; flag++) {
      if (countries_name[flag]['id'] === given_data[n]["Country"]) {
        country_title.text(given_data[n]["Country"]);
        tod.text("at "+formatTime(new Date(given_data[n]['Date (PST)'])))
        break;
      }
    }

    if (flag === countries_name.length) {
      alert(given_data[n]["Country"]);
    }


    globe_country.transition()
        .style("fill", function(d, j) {
              if(j === flag) {
                if(given_data[n]["Category"] === "Neutral") {
                  return color_scale(0.5);
                }
                else if (given_data[n]["Category"] === "Positive") {
                  return color_scale(1);
                }
                else {
                  return color_scale(0);
                }
              }
              else {
                return "#ddd";
              }
            // return j === flag ? "red" : "#b8b8b8";
          });

    var pos_max = 0,
        neg_max = 0;

    for (var j = 0; j < pos.length; j++) {
        pos_max = Math.max(pos_max, pos[j]);
        neg_max = Math.max(neg_max, neg[j]);
    }

    var range_limit = Math.max(pos_max, neg_max);

    flat_country.call(d3.helper.tooltip(
        function(d,j){
          return "<div class='country_name'>"+countries_name[j]['id']+ "</div>"+
                  "<div class='country_volume'>Volume: "+(pos[j]/posnegratio+neg[j])+" Posts</div>"+
                  "<div class='country_pos'>Positive Posts: "+(pos[j]/posnegratio)+" Posts</div>"+
                  "<div class='country_neg'>Negative Posts: "+(neg[j])+" Posts</div>";
        }
      ));

    flat_country.transition()
        .style("fill", function(d, j) {
              var color_val = min_max_norm(country_score[j], range_limit, -range_limit);
              var delta = 0.2;
              if (Math.abs(color_val - 0.5) <= delta) {
                if (color_val > 0.5) {
                  color_val = 0.5 + delta;
                }
                else if (color_val < 0.5) {
                  color_val = 0.5 - delta;
                }
              }
              if(j === flag) {
                return color_scale(color_val);
              }
              else {
                if(activated[j]) {
                  return color_scale(color_val);
                }
                else {
                  return "#ddd";
                }
              }
            // return j === flag ? "red" : "#b8b8b8";
          });

    document.getElementById('tweet').innerHTML = "";

    twttr.widgets.createTweet(
        given_data[n]["GUID"],
        document.getElementById('tweet'),
        {
          align: 'left'
        });


    d3.transition()
        .duration(250)
        .tween("rotate", function() {
          var point = d3.geoCentroid(countries[flag]),
              rotate = d3.interpolate(globe_projection.rotate(), [-point[0], -point[1]]);
          return function(t) {
            globe_projection.rotate(rotate(t));
            globe_country.attr("d", globe_path);
            flat_country.attr("d", flat_path);
          };
        });
  }

  function update(h) {
    // update position and text of label according to slider scale
    handle.attr("cx", slider_x(h));
    label
      .attr("x", slider_x(h))
      .text(formatTime(h) + " (PST)");

    var new_data = our_data.filter(function(d) {
      return new Date(d['Date (PST)']) < h;
    });

    if(new_data.length === 0) {
      new_data = [our_data[0]];
    }

    // filter data set and redraw plot
    drawPlot(new_data);
  }
  update(startDate);
};
