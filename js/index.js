const height = 320;
const width = height * 1.25;
const margin = {top: 50, bottom: 80, left: 100, right: 20}

const log = $("#log");
const input = $("#input");
const neighborhoodPopover = $("#neighborhoodPopover");
const neighborhoodChart = $("#neighborhoodChart");
const mapLegendDiv = $("#legend");

const baseURL = calcBaseURL();



// Whenever this form has a submit event,
// $("form").submit(function (event) {
//     // prevent form from redirecting/making a request and do this instead
//     event.preventDefault();
//
//     // Creates FormData object and sticks file in there
//     let formData = new FormData();
//     let input_text = input.val();
//     formData.append("meow", input_text);
//
//     // Makes a POST request to the uploader endpoint
//     // If successful, tell user file was uploaded successfully and clear #file_input
//     // Else, tell user it failed
//     $.get('model/'+ input_text, function(data){
//
//     }).done(function(response) {
//         console.log(response);
//         log.text("Request was uploaded successfully.");
//         input.val(null);;
//     }).fail(function() {
//         log.text("The request failed.");
//     });
// });

// Load nyc geojson and profit dictionary
Promise.all([
    d3.json(baseURL + "/static/nyc.json"),
    d3.json(baseURL + "/static/just_profit_dict.json"),
    d3.json(baseURL + "/static/forecasts.json"),
    d3.json(baseURL + "/static/agg_data_nbhood.json")



]).then(function([nyc, profit, forecasts, agg_nbhood]){

    // add profit attribute to each feature
    nyc.features.forEach(function(d){
        d.properties.profit = profit[d.properties.neighborhood];
        d.properties.forecasts = forecasts[d.properties.neighborhood];
        d.properties.agg = agg_nbhood[d.properties.neighborhood];

    });

    // hardcoded for now, but can be changed later
    minProfit = -320201.2825470001;
    maxProfit = 135032.2265031793;

    // Not sure if we're gonna use this or not
    colorScale = d3.scaleQuantize()
        .domain([minProfit, maxProfit])
        .range(d3.schemeRdYlGn[9]);

    colorScale_section_size = (maxProfit - minProfit) / 8;

    // Setup map
    mapboxgl.accessToken = 'pk.eyJ1IjoidGFuazc2NSIsImEiOiJjazJ5ZHNndDgwNzI0M2JxdGZpaHh6OTFyIn0.NbINRMNm2chbLryFxoWCtg';
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v10',
        center: [-74.0060, 40.7108],
        zoom: 9,
        minZoom: 9,
        maxZoom: 15,
        maxBounds: new mapboxgl.LngLatBounds(
            new mapboxgl.LngLat(-74.41798730468805, 40.49183755125762),
            new mapboxgl.LngLat(-73.59401269531324, 40.92904478186287)
        )
    });

    makeMapLegend(minProfit, maxProfit);

    // adds zoom widget
    map.addControl(new mapboxgl.NavigationControl());

    // Adds the geojson and coloring on map load
    map.on('load', function () {
        layer = map.addLayer({
            'id': 'neighborhoods',
            'type': 'fill',
            'source': {
                'type': 'geojson',
                'data': nyc
            },
            'layout': {},
            'paint': {
                'fill-color': [
                    'case',
                    ["==", ['get', 'profit'], null],
                    "#a5aeaf",
                    ['interpolate',
                    ['linear'],
                    ['get', 'profit'],
                    minProfit, "#D2222D",
                    0, "#FFE599",
                    maxProfit, "#007000"]
                ],
                'fill-opacity': [
                    'case',
                    ["==", ['get', 'profit'], null],
                    0.6,
                    0.8
                ],
                'fill-outline-color': '#000'
            }
        });
    });
    // The super helpful examples
    // https://docs.mapbox.com/mapbox-gl-js/example/hover-styles/
    // https://docs.mapbox.com/mapbox-gl-js/example/updating-choropleth/

    // Show Upper West Side by default
    makeLineChart("Upper West Side", JSON.stringify(forecasts["Upper West Side"]));
    var table = agg_nbhood_info("Upper West Side", JSON.stringify(agg_nbhood["Upper West Side"]));
    borough_graph();

    // Handles tooltip behavior
    map.on("mousemove", "neighborhoods", function (e) {
        let tooltip = buildToolTip(e.features[0].properties.neighborhood, e.features[0].properties.profit);
        neighborhoodPopover.css("left", e.originalEvent.pageX + "px");
        neighborhoodPopover.css("top", e.originalEvent.pageY + "px");
        neighborhoodPopover.css("opacity", 1);
        neighborhoodPopover.css("z-index", 1);
        neighborhoodPopover.html(tooltip);
    });

    map.on("mouseleave", "neighborhoods", function (e) {
        neighborhoodPopover.css("opacity", 0);
    });

    map.on("click", "neighborhoods", function (e) {
        d3.select("#svg").remove();
        d3.select("#table").remove();
        var table = agg_nbhood_info(e.features[0].properties.neighborhood, e.features[0].properties.agg)
        makeLineChart(e.features[0].properties.neighborhood, e.features[0].properties.forecasts)

    });

});


// Helper functions

function borough_graph() {
    var data = [
  { borough: "Bronx", Forecast: "7349", Airbnb: "2566"},
  { borough: "Manhattan", Forecast: "25877", Airbnb: "9804"},
  { borough: "Staten Island", Forecast: "8235", Airbnb: "1998"},
  { borough: "Queens", Forecast: "12768", Airbnb: "7612"},
  { borough: "Brooklyn", Forecast: "18443", Airbnb: "12002"},
];

    var example_stack = d3.stack()
    .keys(["Forecast", "Airbnb"])
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetNone);
    var stack = example_stack(data);
    console.log(stack)

var x = d3.scaleBand()
  .domain(['Bronx', 'Manhattan', 'Staten Island', 'Queens', 'Brooklyn'])
  .range([0, 300])
  .padding(0.1)
var y = d3.scaleLinear()
  .domain([0, d3.max(stack, function(d) {  return d3.max(d, function(d) { return d[1]; });  })])
  .range([100, 0]);

var colors = ["b33040", "#d25c4d"];

var svg = d3.select("#borough-chart")
      .append("svg")
        .attr("width", 0 + 400)
        .attr("height", 0 + 250)
        .attr("id", "svg")
      .append("g")
        .attr("transform",
              "translate(" + 00 + "," + 0 + ")");

var yAxis = d3.axisLeft()
  .scale(y);

var xAxis = d3.axisBottom()
  .scale(x);

svg.append("g")
  .attr("class", "y axis")
  .attr("transform",
              "translate(" + 60 + "," + 30 + ")")
  .call(yAxis)

svg.append("g")
  .attr("class", "x axis")
  .attr("transform",
              "translate(" + 60 + "," + 130 + ")")  
  .style("fill", "#000")
  .call(xAxis);

svg.append("text")
                .attr("class", "title")
                .text("Borough Profits")
                .attr("text-anchor", "middle")
                .attr("x", 200)
                .attr("y", 10)
                .attr("font-size", "8px");
svg.append("text")
        .attr("class", "title")
        .text("Profit($)")
        .attr("text-anchor", "middle")

        .attr("x", -70)
        .attr("y", 10)

        .attr("font-size", "10px")
        .attr("transform", "rotate(-90)");


// Create groups for each series, rects for each segment 
var groups = svg.selectAll("g.cost")
  .data(stack)
  .enter().append("g")
  .attr("class", "cost")
  .style("fill", function(d, i) { return colors[i]; });

var rect = groups.selectAll("rect")
  .data(function(d) { return d; })
  .enter()
  .append("rect")
  .attr("x", function(d) { return x(d.data.borough) + 77; })
  .attr("y", function(d) { console.log(d[0],  d[1]);return 30+ y(d[1]); })
  .attr("height", function(d) {  return y(d[0]) - y(d[1]); })
  .attr("width", 20);
  // .on("mouseover", function() { tooltip.style("display", null); })
  // .on("mouseout", function() { tooltip.style("display", "none"); })
  // .on("mousemove", function(d) {
  //   var xPosition = d3.mouse(this)[0] - 15;
  //   var yPosition = d3.mouse(this)[1] - 25;
  //   tooltip.attr("transform", "translate(" + xPosition + "," + yPosition + ")");
  //   tooltip.select("text").text(d.y);
  // });



// Draw legend
var legend = svg.selectAll(".legend")
  .data(colors)
  .enter().append("g")
  .attr("class", "legend")
  .attr("transform", function(d, i) { return "translate(30," + i * 10 + ")"; });
 
legend.append("rect")
  .attr("x", 268)
  .attr("width", 8)
  .attr("height", 8)
  .style("fill", function(d, i) {return colors.slice()[i];});
 
legend.append("text")
  .attr("x",  280)
  .attr("y", 6)
  .attr("dy", "1px")
  .attr("font-size", "8px")

  .style("text-anchor", "start")
  .text(function(d, i) { 
    switch (i) {
      case 0: return "Forecast";
      case 1: return "Airbnb";
    }
  });

  
}

function agg_nbhood_info(neighborhood, dict){
    dict = JSON.parse(dict);
    console.log(dict);
    var table = d3.select("#agg-data").append("table")
            .attr("style", "margin-left: 0px")
            .attr("style", "font-size: 6.5px")

            .attr("id", "table");
    var thead = table.append("thead");
    var tbody = table.append("tbody");
    var columns = ['near_landmarks', 'near_subways', 'most_recent', 'availability_365', 'calculated_host_listings_count', 'minimum_nights', 'price']
    // append the header row
    data = Object.keys(dict).map(function(k) { return {key:k, value:dict[k]} })
    thead.append("tr")
        .selectAll("th")
        .data(['Attribute', 'Average Value'])
        .enter()
        .append("th")
            .text(function(column) { return column; });

    // create a row for each object in the data
    var rows = tbody.selectAll("tr")
        .data(data)
        .enter()
        .append('tr');
    rows.append("td")
    .text(function(d) { ;return d.key; });

    rows
    .append("td")
    .append("input")
    .attr('readonly', true)
    .attr("name", "byName")
    .attr("type", "text")
    .attr("value",function(d) { return Math.round(d.value); });

    // create a cell in each row for each column
    // var cells = rows.selectAll("td")
    //     .data(function(row) {
    //         return columns.map(function(column) {
    //             console.log(row[column]);
    //             return {column: column, value: row[column]};
    //         });
    //     })
    //     .enter()
    //     .append("td")
    //     .attr("style", "font-family: Courier") // sets the font style
    //         .html(function(d) { return d.value; });
    
    return table;

}
function makeLineChart(neighborhood, dict){
    var svg = d3.select("#neighborhoodChart")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("id", "svg");

    var data = [];
    var dataSeries = { type: "line" };
    var dataPoints = [];
    dict = JSON.parse(dict);
    var combined_data = dict.historical_prices.concat(dict.forecast_prices)
    var year = 1996
    var month = 0
    for (var i=0; i < combined_data.length; i++){
        dataPoints.push({
            date: new Date(year, month, 1),
            forecast:combined_data[i]
        });
        month += 1;
        if (month > 12){
            month = 1;
            year += 1;
        }
    }

    dataSeries.dataPoints = dataPoints;
    data.push(dataSeries);

    // Line Chart Title
    svg.append("text")
				.attr("class", "title")
				.text(neighborhood + " Housing Prices (1996 - 2024)")
				.attr("text-anchor", "middle")
				.attr("x", (width/2 + margin.left))
				.attr("y", margin.top/2)
				.attr("font-size", "18px");

    // Add X axis
    var x = d3.scaleTime()
      .domain(d3.extent(dataPoints, function(d) { return d.date; }))
      .range([ 0, width ]);

    svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + (height + margin.top) + ")")
      .attr("class", "x_axis")
      .call(d3.axisBottom(x));

    svg.append("text")
        .text("Year")
        .attr("text-anchor", "middle")
        .attr("x", margin.left + width/2)
        .attr("y", margin.top + height + margin.bottom/2)
        .attr("font-size", "0.8rem");

    // Add Y axis
    var y = d3.scaleLinear()
      .domain([d3.min(dataPoints, function(d) { return +d.forecast; }), d3.max(dataPoints, function(d) { return +d.forecast; })])
      .range([ height, 0 ]);
    svg.append("g")
      .attr("class", "y_axis")
      .attr("transform", "translate("+ margin.left +", " + margin.top + ")")
      .call(d3.axisLeft(y));

    // Y axis label
    svg.append("text")
        .text("Price ($)")
        .attr("text-anchor", "middle")
        .attr("y", margin.left/3)
        .attr("x", -(margin.top + height/2))
        .attr("font-size", "0.8rem")
        .attr("transform", "rotate(-90)");

    // Plot line
    svg.append("path")
      .datum(dataPoints)
      .attr("fill", "steelblue")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("class", "line")
      .attr("d", d3.line()
        .x(function(d) { return x(d.date) + margin.left })
        .y(function(d) { return y(d.forecast) + margin.top })
        );

}

function formatMoney(num){
    var prefix = "$";
    var strNum = num.toString();
    if(strNum[0] == "-"){
        strNum = strNum.substr(1);
        prefix = "-" + prefix;
    }
    return prefix + strNum;
}

// Puts profit below the name if there is a value. Nothing under the name otherwise.
function buildToolTip(neighborhood, num){
    var result = neighborhood;
    if(num != "null"){
        result += "<br/>" + formatMoney(num);
    }
    return result;
}

// Standardizes baseURL to not have a slash at the end.
// Allows app to run locally and in production
function calcBaseURL(){
    var result = window.location.href;
    if(result[result.length - 1] == "/"){
        result = result.substr(0, result.length - 1);
    }
    return result;
}

function makeMapLegend(minProfit, maxProfit){
    let svg = d3.select("#legend").append("svg");
    svg.attr("width", "100%")
        .attr("height", "50px")
        .attr("id", "map-legend");

    let defs = svg.append("defs");
    let linearGradient = defs.append("linearGradient")
        .attr("id", "linear-gradient");

    linearGradient
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

    // Assumes that there are both negative and positive profits. Update if that ever changes.
    let middleOffset = (-1*minProfit/(maxProfit - minProfit)*100).toFixed(4).toString() + "%";

    //Set the color for the start (0%)
    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#D2222D");

    //Set the color for the end (50%)
    linearGradient.append("stop")
        .attr("offset", middleOffset)
        .attr("stop-color", "#FFE599");

    //Set the color for the end (100%)
    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#007000");

    svg.append("rect")
        .attr("width", "200px")
        .attr("height", "10px")
        .style("fill", "url(#linear-gradient)")
        .style("fill-opacity", 0.90)

        .attr("transform", "translate(20,20)");

    // legend title
    svg.append("text")
        .attr("class", "legendTitle")
        .attr("x", 120)
        .attr("y", 10)
        .style("text-anchor", "middle")
        .text("Expected Profit ($)")
        .style("font-size", "0.8rem");

    //Set scale for x-axis
    var xScale = d3.scaleLinear()
         .range([0, 200])
         .domain([ minProfit, maxProfit] );

    //Define x-axis
    var xAxis = d3.axisBottom(xScale)
          // .ticks(5)
        .tickValues([minProfit, 0, maxProfit])
          //.tickFormat(formatPercent)
          .scale(xScale);

    //Set up X axis
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(20,25)")
        .attr('stroke-width', 0)
        .call(xAxis);
}